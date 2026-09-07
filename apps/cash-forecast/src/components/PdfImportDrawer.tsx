import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Alert, Button, Checkbox, Chip, Drawer, Input, Label, Spinner, TextField } from '@heroui/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { formatYen } from '../lib/money'
import { notifyDeleted, notifyError, notifySaved } from '../lib/notify'
import { extractPdfLines } from '../lib/pdfImport/extractPdfLines'
import { parseJfcSchedule, type ParsedSchedule } from '../lib/pdfImport/jfc'
import { buildCandidates, type ImportCandidate } from '../lib/pdfImport/classify'

type PdfImportDrawerProps = {
  opened: boolean
  onClose: () => void
  anchorDate: string
  existingImportKeys: ReadonlySet<string>
}

const DEFAULT_PREFIX = '日本公庫 返済'
const MAX_PREFIX_LENGTH = 80
// convex/imports.ts の commit と同じ上限（サーバー側が最終防衛だが、UI側でも先に案内する）
const MAX_SUBMIT_ROWS = 400

// "YYYY-MM-DD" を "YYYY/M/D" 表示にする。年をまたぐPDFで年を省略すると混乱するため、
// lib/date.ts の formatDateShort（月/日のみ）はここでは使わずローカルで整形する。
function formatDateWithYear(yyyyMmDd: string): string {
  const [year, month, day] = yyyyMmDd.split('-')
  return `${year}/${Number(month)}/${Number(day)}`
}

export function PdfImportDrawer({ opened, onClose, anchorDate, existingImportKeys }: PdfImportDrawerProps) {
  // 取り込み送信中・取り消し中はドロワーを閉じられないようにする（子の phase を親に上げる）
  const [busy, setBusy] = useState(false)

  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger isDisabled={busy} />
          <Drawer.Header>
            <Drawer.Heading>PDFから取り込む</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <PdfImportContent
                anchorDate={anchorDate}
                existingImportKeys={existingImportKeys}
                onClose={onClose}
                onBusyChange={setBusy}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

type Phase = 'pick' | 'parsing' | 'preview' | 'submitting' | 'done'

type DoneResult = { inserted: number; skippedPast: number; skippedDuplicate: number }

function PdfImportContent({
  anchorDate,
  existingImportKeys,
  onClose,
  onBusyChange,
}: {
  anchorDate: string
  existingImportKeys: ReadonlySet<string>
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const commit = useMutation(api.imports.commit)
  const undo = useMutation(api.imports.undo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('pick')
  const [pickError, setPickError] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<ParsedSchedule | null>(null)
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX)
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set())
  const [batchId, setBatchId] = useState<string | null>(null)
  const [doneResult, setDoneResult] = useState<DoneResult | null>(null)
  const [undoing, setUndoing] = useState(false)

  // submitting/undoing の間はドロワーを閉じられないよう、親にbusy状態を伝える。
  // アンマウント時（ドロワーが閉じられた時）は必ずfalseに戻し、次回オープン時に持ち越さない。
  useEffect(() => {
    onBusyChange(phase === 'submitting' || undoing)
    return () => onBusyChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, undoing])

  const candidates = useMemo<ImportCandidate[]>(() => {
    if (!schedule) return []
    return buildCandidates({ schedule, prefix, anchorDate, existingImportKeys })
  }, [schedule, prefix, anchorDate, existingImportKeys])

  const handlePickClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 同じファイルを選び直したときも onChange が発火するようにリセットしておく
    e.target.value = ''
    if (!file) return

    setPickError(null)
    setPhase('parsing')
    try {
      const lines = await extractPdfLines(file)
      const result = parseJfcSchedule(lines)
      if (!result.ok) {
        setPickError(result.error)
        setPhase('pick')
        return
      }
      const initialCandidates = buildCandidates({
        schedule: result.schedule,
        prefix: DEFAULT_PREFIX,
        anchorDate,
        existingImportKeys,
      })
      setSchedule(result.schedule)
      setCheckedKeys(new Set(initialCandidates.filter((c) => c.status === 'ready').map((c) => c.importKey)))
      setPhase('preview')
    } catch {
      setPickError('PDFを読み取れませんでした')
      setPhase('pick')
    }
  }

  const eligibleKeys = candidates
    .filter((c) => c.status === 'ready' || c.status === 'warning')
    .map((c) => c.importKey)
  const allSelected = eligibleKeys.length > 0 && eligibleKeys.every((k) => checkedKeys.has(k))
  const checkedCount = candidates.filter(
    (c) => checkedKeys.has(c.importKey) && (c.status === 'ready' || c.status === 'warning'),
  ).length

  const statusCounts = candidates.reduce(
    (acc, c) => {
      acc[c.status]++
      return acc
    },
    { ready: 0, past: 0, duplicate: 0, warning: 0 } as Record<ImportCandidate['status'], number>,
  )

  const toggleAll = () => {
    setCheckedKeys(allSelected ? new Set() : new Set(eligibleKeys))
  }

  const toggleOne = (importKey: string, checked: boolean) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(importKey)
      else next.delete(importKey)
      return next
    })
  }

  const handleSubmit = async () => {
    const rows = candidates
      .filter((c) => checkedKeys.has(c.importKey) && (c.status === 'ready' || c.status === 'warning'))
      .map((c) => ({ importKey: c.importKey, date: c.date, name: c.name, kind: c.kind, amount: c.amount }))
    if (rows.length === 0 || rows.length > MAX_SUBMIT_ROWS) return

    const newBatchId = crypto.randomUUID()
    setPhase('submitting')
    try {
      const result = await commit({ importBatchId: newBatchId, rows })
      setBatchId(newBatchId)
      setDoneResult(result)
      setPhase('done')
      if (result.inserted > 0) {
        notifySaved('取り込みました')
      }
    } catch (err) {
      notifyError(err, '取り込みに失敗しました')
      setPhase('preview')
    }
  }

  const handleUndo = async () => {
    if (!batchId) return
    setUndoing(true)
    try {
      const result = await undo({ importBatchId: batchId })
      notifyDeleted(`${result.deleted}件の取り込みを取り消しました`)
      onClose()
    } catch (err) {
      notifyError(err, '取り消しに失敗しました')
    } finally {
      setUndoing(false)
    }
  }

  if (phase === 'pick' || phase === 'parsing') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          日本政策金融公庫の「お支払額明細書」PDFを読み込み、各回の返済額を予定として登録します。PDFは端末内で解析され、サーバーには送信されません。
        </p>

        {phase === 'parsing' ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Spinner />
            <span className="text-sm text-muted">解析中…</span>
          </div>
        ) : (
          <Button onPress={handlePickClick}>PDFを選択</Button>
        )}

        {pickError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{pickError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={handleFileChange}
        />
      </div>
    )
  }

  // preview / submitting / done は schedule が確定している前提
  if (!schedule) return null

  if (phase === 'done') {
    const result = doneResult
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {result?.inserted ?? 0}件を登録しました
          {result && (result.skippedDuplicate > 0 || result.skippedPast > 0) && (
            <span className="text-muted">
              （
              {[
                result.skippedDuplicate > 0 ? `重複 ${result.skippedDuplicate}件` : null,
                result.skippedPast > 0 ? `支払済み ${result.skippedPast}件` : null,
              ]
                .filter(Boolean)
                .join('・')}
              はスキップ）
            </span>
          )}
        </p>
        <div className="flex justify-between gap-2">
          <Button variant="danger-soft" onPress={handleUndo} isPending={undoing} isDisabled={undoing}>
            {undoing && <Spinner color="current" size="sm" />}
            取り消す
          </Button>
          <Button onPress={onClose}>閉じる</Button>
        </div>
      </div>
    )
  }

  // preview / submitting
  const isSubmitting = phase === 'submitting'
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        取引番号 {schedule.contractId}・全{schedule.totalCount}回
      </p>

      {schedule.scheduleWarnings.length > 0 && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            {schedule.scheduleWarnings.map((w) => (
              <Alert.Description key={w}>{w}</Alert.Description>
            ))}
          </Alert.Content>
        </Alert>
      )}

      <TextField isDisabled={isSubmitting}>
        <Label>項目名</Label>
        <Input value={prefix} onChange={(e) => setPrefix(e.target.value.slice(0, MAX_PREFIX_LENGTH))} />
      </TextField>

      <div className="flex flex-wrap gap-2">
        {statusCounts.ready > 0 && <Chip size="sm" variant="soft">登録 {statusCounts.ready}件</Chip>}
        {statusCounts.past > 0 && <Chip size="sm" variant="soft">支払済み {statusCounts.past}件</Chip>}
        {statusCounts.duplicate > 0 && <Chip size="sm" variant="soft">登録済み {statusCounts.duplicate}件</Chip>}
        {statusCounts.warning > 0 && (
          <Chip size="sm" variant="soft" color="warning">要確認 {statusCounts.warning}件</Chip>
        )}
      </div>

      <Button variant="tertiary" size="sm" className="self-start" onPress={toggleAll} isDisabled={isSubmitting}>
        {allSelected ? '解除' : 'すべて選択'}
      </Button>

      <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto">
        {candidates.map((candidate) => {
          const isBlocked = candidate.status === 'past' || candidate.status === 'duplicate'
          const isChecked = !isBlocked && checkedKeys.has(candidate.importKey)
          return (
            <div key={candidate.importKey} className="flex flex-col gap-0.5">
              <Checkbox
                isSelected={isChecked}
                isDisabled={isBlocked || isSubmitting}
                onChange={(checked) => toggleOne(candidate.importKey, checked)}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <div className={`flex flex-1 items-center justify-between gap-2 ${isBlocked ? 'text-muted' : ''}`}>
                    <span className="shrink-0 text-sm tabular-nums">{formatDateWithYear(candidate.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {candidate.name}
                      {candidate.status === 'past' && (
                        <span className="ml-1.5 text-xs text-muted">（支払済み）</span>
                      )}
                      {candidate.status === 'duplicate' && (
                        <span className="ml-1.5 text-xs text-muted">（登録済み）</span>
                      )}
                    </span>
                    <span className={`shrink-0 text-sm tabular-nums ${isBlocked ? '' : 'text-red-600'}`}>
                      {formatYen(candidate.amount)}
                    </span>
                  </div>
                </Checkbox.Content>
              </Checkbox>
              {candidate.status === 'warning' &&
                candidate.warnings.map((w) => (
                  <p key={w} className="pl-7 text-xs text-warning">
                    {w}
                  </p>
                ))}
            </div>
          )
        })}
      </div>

      <Button
        onPress={handleSubmit}
        isPending={isSubmitting}
        isDisabled={checkedCount === 0 || checkedCount > MAX_SUBMIT_ROWS || isSubmitting}
      >
        {isSubmitting && <Spinner color="current" size="sm" />}
        {checkedCount}件を登録
      </Button>
      {checkedCount > MAX_SUBMIT_ROWS && (
        <p className="text-xs text-warning">一度に登録できるのは400件までです</p>
      )}
    </div>
  )
}
