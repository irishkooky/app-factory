import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Badge, Button, Checkbox, Divider, Drawer, FileInput, Group, Loader, Modal,
  MantineProvider, NumberInput, Paper, ScrollArea, SegmentedControl, Stack, Table, Tabs, Text, TextInput, Title,
} from '@mantine/core'
import { IconAlertTriangle, IconFileTypePdf, IconHistory, IconUpload } from '@tabler/icons-react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { applyBankBusinessDays, nextBankBusinessDay } from '../lib/bankBusinessDay'
import { readKoukoPdf, sha256File, validatePdfFile } from '../lib/koukoPdf'
import type { PdfImportRow } from '../lib/pdfImportTypes'
import { formatYen } from '../lib/money'
import { theme } from '../theme'

type EditableRow = PdfImportRow & { selected: boolean; holidayUnconfirmed: boolean }
type PreviewItem = { installment: number; status: 'new' | 'past' | 'duplicate' | 'conflict'; canAcknowledge: boolean; message?: string }

type ImportBatch = FunctionReturnType<typeof api.pdfImports.list>[number]
const shiftEra = (date: string, from: '令和' | '平成', to: '令和' | '平成') => {
  const year = Number(date.slice(0, 4)) + (to === '令和' ? 2018 : 1988) - (from === '令和' ? 2018 : 1988)
  return `${year}${date.slice(4)}`
}
export const isValidImportRow = (row: PdfImportRow, anchorDate: string) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  && row.date > anchorDate && row.name.trim().length > 0
  && [row.principal, row.interest, row.amount].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000)
  && row.principal + row.interest === row.amount
export const canSubmitPreview = (rows: EditableRow[], anchorDate: string, loanKey: string, eraConfirmed: boolean, holidayConfirmed: boolean) => {
  const chosen = rows.filter((row) => row.selected)
  return chosen.length > 0 && loanKey.trim().length > 0 && eraConfirmed
    && chosen.every((row) => isValidImportRow(row, anchorDate))
    && (!chosen.some((row) => row.holidayUnconfirmed) || holidayConfirmed)
}

export function PdfImportDrawer(props: { opened: boolean; onClose: () => void; anchorDate: string }) {
  return <MantineProvider theme={theme} withGlobalClasses={false}><PdfImportDrawerContent {...props} /></MantineProvider>
}

function PdfImportDrawerContent({ opened, onClose, anchorDate }: { opened: boolean; onClose: () => void; anchorDate: string }) {
  const convex = useConvex()
  const commitImport = useMutation(api.pdfImports.commit)
  const cancelImport = useMutation(api.pdfImports.cancel)
  const batches = useQuery(api.pdfImports.list, opened ? {} : 'skip')
  const [tab, setTab] = useState<string | null>('import')
  const [file, setFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState('')
  const [rows, setRows] = useState<EditableRow[]>([])
  const [loanKey, setLoanKey] = useState('')
  const [era, setEra] = useState<'令和' | '平成'>('令和')
  const [eraConfirmed, setEraConfirmed] = useState(false)
  const [holidayConfirmed, setHolidayConfirmed] = useState(false)
  const [preview, setPreview] = useState<PreviewItem[] | null>(null)
  const [alreadyImported, setAlreadyImported] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const previewGeneration = useRef(0)

  const invalidate = () => { previewGeneration.current += 1; setPreview(null); setConfirming(false) }
  const reset = () => {
    controller.current?.abort(); controller.current = null
    setFile(null); setFileHash(''); setRows([]); setLoanKey(''); setEra('令和'); setEraConfirmed(false)
    setHolidayConfirmed(false); setPreview(null); setAlreadyImported(false); setConfirming(false); setBusy(false); setError(null)
  }
  useEffect(() => () => controller.current?.abort(), [])

  const handleClose = () => { if (!busy) { reset(); onClose() } }
  const handleFile = async (next: File | null) => {
    controller.current?.abort(); reset(); setFile(next)
    if (!next) return
    try { validatePdfFile(next) } catch (cause) { setError(messageOf(cause, 'PDFを確認してください。')); return }
    const active = new AbortController(); controller.current = active; setBusy(true)
    try {
      const [parsed, hash] = await Promise.all([readKoukoPdf(next, active.signal), sha256File(next)])
      if (active.signal.aborted) return
      const adjusted = applyBankBusinessDays(parsed.rows).map((row) => ({ ...row, selected: row.date > anchorDate, name: row.name }))
      setRows(adjusted); setLoanKey(parsed.loanKey); setEra(parsed.era); setFileHash(hash)
      setError(parsed.warnings[0] ?? null)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'PDFを読み取れませんでした。')
    } finally { if (!active.signal.aborted) setBusy(false) }
  }
  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    const acknowledgmentOnly = Object.keys(patch).every((key) => key === 'acknowledgedDuplicate')
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch, acknowledgedDuplicate: acknowledgmentOnly ? patch.acknowledgedDuplicate : undefined, amount: (patch.principal ?? row.principal) + (patch.interest ?? row.interest) } : row))
    if (!acknowledgmentOnly) invalidate()
  }
  const previewByInstallment = useMemo(() => new Map(preview?.map((item) => [item.installment, item])), [preview])
  const chosen = rows.filter((row) => row.selected)
  const uncertainChosen = chosen.some((row) => row.holidayUnconfirmed)
  const totals = rows.reduce((value, row) => ({ amount: value.amount + row.amount, principal: value.principal + row.principal, interest: value.interest + row.interest }), { amount: 0, principal: 0, interest: 0 })
  const canPreview = rows.length > 0 && canSubmitPreview(rows, anchorDate, loanKey, eraConfirmed, holidayConfirmed) && !busy

  const runPreview = async () => {
    if (!canPreview) return
    const generation = ++previewGeneration.current
    setBusy(true); setError(null)
    try {
      const result = await convex.query(api.pdfImports.preview, { loanKey: loanKey.trim(), fileHash, rows: chosen.map(stripUi) })
      if (generation !== previewGeneration.current) return
      setPreview(result.rows); setAlreadyImported(result.alreadyImported); setConfirming(false)
      setRows((current) => current.map((row) => {
        const item = result.rows.find((candidate) => candidate.installment === row.installment)
        return item && (item.status === 'past' || item.status === 'duplicate' || (item.status === 'conflict' && !item.canAcknowledge)) ? { ...row, selected: false } : row
      }))
    } catch (cause) { setError(messageOf(cause, '重複確認に失敗しました。')) }
    finally { setBusy(false) }
  }
  const commitRows = rows.filter((row) => row.selected).map((row) => {
    const item = previewByInstallment.get(row.installment)
    return { ...stripUi(row), acknowledgedDuplicate: item?.status === 'conflict' ? row.acknowledgedDuplicate === true : undefined }
  })
  const unacknowledged = commitRows.some((row) => previewByInstallment.get(row.installment)?.status === 'conflict' && !row.acknowledgedDuplicate)
  const commit = async () => {
    if (!preview || unacknowledged || commitRows.length === 0 || !file) return
    setBusy(true); setError(null)
    try {
      await commitImport({ loanKey: loanKey.trim(), fileHash, fileName: file.name.slice(0, 200), rows: commitRows })
      reset(); setTab('history')
    } catch (cause) { setError(messageOf(cause, '登録に失敗しました。編集内容は保持されています。')) }
    finally { setBusy(false) }
  }

  return <Drawer opened={opened} onClose={handleClose} closeOnClickOutside={!busy} closeOnEscape={!busy} size="xl" position="right" title="公庫PDFから取り込む" withinPortal>
    <Tabs value={tab} onChange={setTab}>
      <Tabs.List grow><Tabs.Tab value="import" leftSection={<IconUpload size={16} />}>取り込む</Tabs.Tab><Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>取込履歴</Tabs.Tab></Tabs.List>
      <Tabs.Panel value="import" pt="md"><Stack>
        <Alert color="indigo" title="PDFは端末内で読み取ります">元のPDFは保存・送信しません。登録されるのは確認した返済明細だけです。</Alert>
        <FileInput value={file} onChange={handleFile} accept="application/pdf" clearable disabled={busy} label="お支払額明細書" placeholder="10MB・10ページまで" leftSection={<IconFileTypePdf size={18} />} />
        {busy && !rows.length && <Group justify="center"><Loader size="sm" /><Text size="sm">PDFを読み取っています…</Text></Group>}
        {error && <Alert color="red" title="確認してください">{error}</Alert>}
        {rows.length > 0 && <>
          <Paper withBorder p="md"><Group justify="space-between" align="start"><div><Title order={4}>{rows.length}件を抽出</Title><Text size="sm">{rows[0].sourceDate}〜{rows.at(-1)?.sourceDate}</Text></div><div><Text fw={700}>{formatYen(totals.amount)}</Text><Text size="xs">元金 {formatYen(totals.principal)}・利息 {formatYen(totals.interest)}</Text></div></Group></Paper>
          <Group grow align="end"><SegmentedControl disabled={busy} value={era} onChange={(value) => { const next = value as '令和' | '平成'; try { const converted = rows.map((row) => { const sourceDate = shiftEra(row.sourceDate, era, next); const adjusted = nextBankBusinessDay(sourceDate); return { ...row, sourceDate, date: adjusted.date, holidayUnconfirmed: adjusted.holidayUnconfirmed, acknowledgedDuplicate: undefined } }); setRows(converted); setEra(next); setEraConfirmed(false); setHolidayConfirmed(false); setError(null); invalidate() } catch { setError('元号を変更すると存在しない日付になります。元号とPDFの日付を確認してください。') } }} data={['令和','平成']} /><TextInput disabled={busy} label="融資の名前・番号" description="同じ借入は毎回同じ名前・番号で取り込んでください" value={loanKey} onChange={(event) => { setLoanKey(event.currentTarget.value); setRows((current) => current.map((row) => ({ ...row, acknowledgedDuplicate: undefined }))); invalidate() }} /></Group>
          <Checkbox checked={eraConfirmed} onChange={(event) => { setEraConfirmed(event.currentTarget.checked); invalidate() }} label={`PDFの年表記を「${era}」として確認しました`} />
          {rows.some((row) => row.holidayUnconfirmed) && <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title="祝日未確定">2026〜2027年以外はこのアプリに収録した祝日データの範囲外です。土日・年末年始のみ補正しています。</Alert>}
          {uncertainChosen && <Checkbox color="yellow" checked={holidayConfirmed} onChange={(event) => { setHolidayConfirmed(event.currentTarget.checked); invalidate() }} label="祝日未確定の予定日を確認しました" />}
          <TextInput label="名称を一括変更" placeholder="入力すると選択中の明細に反映" onBlur={(event) => { const name = event.currentTarget.value.trim(); if (name) { setRows((current) => current.map((row) => row.selected ? { ...row, name, acknowledgedDuplicate: undefined } : row)); invalidate() } }} />
          <Text size="sm" c="dimmed">過去・登録済み・取込済み明細との競合は選択できません。登録後も予測画面には今後12ヶ月分だけ表示されます。</Text>
          <Group gap="xs"><Button size="xs" variant="subtle" disabled={busy} onClick={() => { setRows((current) => current.map((row) => ({ ...row, selected: row.date > anchorDate, acknowledgedDuplicate: undefined }))); invalidate() }}>対象をすべて選択</Button><Button size="xs" variant="subtle" disabled={busy} onClick={() => { setRows((current) => current.map((row) => ({ ...row, selected: false, acknowledgedDuplicate: undefined }))); invalidate() }}>すべて解除</Button></Group>
          <ScrollArea type="auto" mah="50vh"><Table striped withTableBorder miw={980}><Table.Thead><Table.Tr><Table.Th>取込</Table.Th><Table.Th>回</Table.Th><Table.Th>記載日</Table.Th><Table.Th>予定日</Table.Th><Table.Th>名称</Table.Th><Table.Th>元金</Table.Th><Table.Th>利息</Table.Th><Table.Th>合計</Table.Th><Table.Th>頁・状態</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{rows.map((row, index) => {
              const item = previewByInstallment.get(row.installment); const blocked = row.date <= anchorDate || item?.status === 'past' || item?.status === 'duplicate' || (item?.status === 'conflict' && !item.canAcknowledge)
              return <Table.Tr key={`${row.installment}-${row.page}`}>
                <Table.Td><Checkbox aria-label={`${row.installment}回目を選択`} checked={row.selected && !blocked} disabled={blocked || busy} onChange={(event) => updateRow(index, { selected: event.currentTarget.checked })} /></Table.Td>
                <Table.Td>{row.installment}</Table.Td><Table.Td>{row.sourceDate}</Table.Td>
                <Table.Td><TextInput disabled={busy} aria-label={`${row.installment}回目の予定日`} type="date" value={row.date} onChange={(event) => updateRow(index, { date: event.currentTarget.value })} /></Table.Td>
                <Table.Td><TextInput disabled={busy} aria-label={`${row.installment}回目の名称`} value={row.name} onChange={(event) => updateRow(index, { name: event.currentTarget.value })} /></Table.Td>
                <Table.Td><NumberInput disabled={busy} aria-label={`${row.installment}回目の元金`} value={row.principal} min={0} allowDecimal={false} onChange={(value) => updateRow(index, { principal: Number(value) || 0 })} /></Table.Td>
                <Table.Td><NumberInput disabled={busy} aria-label={`${row.installment}回目の利息`} value={row.interest} min={0} allowDecimal={false} onChange={(value) => updateRow(index, { interest: Number(value) || 0 })} /></Table.Td>
                <Table.Td>{formatYen(row.amount)}</Table.Td><Table.Td><Stack gap={3}><Text size="xs">p.{row.page}</Text>{row.holidayUnconfirmed && <Badge color="yellow" tt="none">祝日未確定</Badge>}{item && <Badge color={item.status === 'new' ? 'green' : item.status === 'conflict' ? 'orange' : 'gray'} tt="none">{{ new: '登録可能', past: '基準日以前', duplicate: '登録済み', conflict: '要確認' }[item.status]}</Badge>}{item?.message && <Text size="xs">{item.message}</Text>}{item?.status === 'conflict' && !blocked && row.selected && <Checkbox size="xs" checked={row.acknowledgedDuplicate === true} onChange={(event) => updateRow(index, { acknowledgedDuplicate: event.currentTarget.checked })} label="確認して追加" />}</Stack></Table.Td>
              </Table.Tr> })}</Table.Tbody></Table></ScrollArea>
          <Text size="sm">選択 {chosen.length}件・除外 {rows.length - chosen.length}件</Text>
          {chosen.some((row) => !isValidImportRow(row, anchorDate)) && <Alert color="red">選択した明細の日付・名称・金額を確認してください。予定日は基準日より後にします。</Alert>}
          {!preview ? <Button onClick={runPreview} disabled={!canPreview} loading={busy}>重複を確認</Button> : <><Alert color={alreadyImported ? 'red' : 'blue'}>{alreadyImported ? '同じPDFはすでに取り込まれています。取込履歴を確認してください。' : '確認結果は現在の編集内容に対応しています。登録する内容をもう一度確認してください。'}</Alert><Button variant="outline" onClick={() => setConfirming(true)} disabled={alreadyImported || chosen.length === 0 || unacknowledged || busy}>登録内容を確認</Button></>}
        </>}
      </Stack></Tabs.Panel>
      <Tabs.Panel value="history" pt="md"><ImportHistory batches={batches} busy={busy} onCancel={async (batchId) => { setBusy(true); try { await cancelImport({ batchId }); return null } catch (cause) { return messageOf(cause, '取込の取り消しに失敗しました。') } finally { setBusy(false) } }} /></Tabs.Panel>
    </Tabs>
    <Modal opened={confirming} onClose={() => { if (!busy) setConfirming(false) }} title="この内容で登録しますか？" centered closeOnClickOutside={!busy}>
      <Stack><Text>{commitRows.length}件、合計 {formatYen(commitRows.reduce((sum, row) => sum + row.amount, 0))} を支出予定として登録します。</Text><Text size="sm" c="dimmed">借入残高や元金を別途支出に加算することはありません。</Text><Group justify="end"><Button variant="default" onClick={() => setConfirming(false)} disabled={busy}>戻る</Button><Button onClick={commit} loading={busy}>登録する</Button></Group></Stack>
    </Modal>
  </Drawer>
}

function stripUi(row: EditableRow): PdfImportRow { const { selected: _selected, holidayUnconfirmed: _uncertain, ...saved } = row; return saved }
function messageOf(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback }

function ImportHistory({ batches, busy, onCancel }: { batches: ImportBatch[] | undefined; busy: boolean; onCancel: (id: Id<'pdfImportBatches'>) => Promise<string | null> }) {
  const [batchId, setBatchId] = useState<Id<'pdfImportBatches'> | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const details = useQuery(api.pdfImports.details, batchId ? { batchId } : 'skip')
  if (batches === undefined) return <Group justify="center"><Loader size="sm" /></Group>
  if (batches.length === 0) return <Text c="dimmed">取込履歴はありません。</Text>
  return <Stack>{batches.map((batch) => <Paper key={batch._id} withBorder p="md"><Group justify="space-between"><div><Text fw={600}>{batch.fileName}</Text><Text size="sm" c="dimmed">{new Date(batch.createdAt).toLocaleString('ja-JP')}・{batch.count}件・{batch.status === 'cancelled' ? '取消済み' : '登録済み'}</Text>{batch.cancellationReason && <Text size="xs" c="red">{batch.cancellationReason}</Text>}</div><Button size="xs" variant="light" onClick={() => setBatchId(batch._id)}>明細</Button></Group></Paper>)}
    <Modal opened={batchId !== null} onClose={() => { if (!busy) { setBatchId(null); setConfirmCancel(false); setCancelError(null) } }} title="取込明細" size="lg"><Stack>{details === undefined ? <Loader size="sm" /> : details.map((row) => <Group key={`${row.sourceDate}-${row.installment}`} justify="space-between"><Text size="sm">{row.installment}回 {row.sourceDate} → {row.date}<br />元金 {formatYen(row.principal)}・利息 {formatYen(row.interest)}</Text><Text>{formatYen(row.amount)}</Text></Group>)}<Divider />{cancelError && <Alert color="red">{cancelError}</Alert>}{!confirmCancel ? <Button color="red" variant="outline" disabled={!batches.find((batch) => batch._id === batchId)?.cancellable} onClick={() => { setCancelError(null); setConfirmCancel(true) }}>この取込を取り消す</Button> : <Alert color="red" title="取り消しますか？"><Stack><Text size="sm">この取込で作成した未確定・未編集の予定を削除します。</Text><Button color="red" loading={busy} onClick={async () => { if (batchId) { const failure = await onCancel(batchId); if (failure) { setCancelError(failure); return } setBatchId(null); setConfirmCancel(false) } }}>取り消す</Button></Stack></Alert>}</Stack></Modal>
  </Stack>
}
