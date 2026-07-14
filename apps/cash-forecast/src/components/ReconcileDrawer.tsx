import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Button,
  Checkbox,
  Drawer,
  FieldError,
  Label,
  NumberField,
  Separator,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { ForecastRow } from '../lib/forecast'
import type { HistoryRow } from '../lib/history'
import { addDays, formatDateShort, todayJST } from '../lib/date'
import { formatYen } from '../lib/money'
import { notifyError, notifySaved } from '../lib/notify'
import { compressImage } from '../lib/image'
import { matchExtractedRows, validateBalanceChain, type ExtractedRow, type OcrMatch } from '../lib/ocrMatch'
import { ProGate } from './BillingControls'

type ReconcileDrawerProps = {
  opened: boolean
  onClose: () => void
  currentBalance: number
  anchorDate: string
  anchorBalance: number
  pendingRows: ForecastRow[]
  historyRows: HistoryRow[]
}

export function ReconcileDrawer({
  opened,
  onClose,
  currentBalance,
  anchorDate,
  anchorBalance,
  pendingRows,
  historyRows,
}: ReconcileDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>残高を合わせる</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            {opened && (
              <ReconcileBody
                key={anchorDate}
                currentBalance={currentBalance}
                anchorDate={anchorDate}
                anchorBalance={anchorBalance}
                pendingRows={pendingRows}
                historyRows={historyRows}
                onClose={onClose}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

// 行ごとの選択。仮想行は materialize/skip の2択、実体行は materialize/delete/postpone の3択。
type RowAction = 'materialize' | 'skip' | 'delete' | 'postpone'

type ReconcileOp =
  | {
      type: 'materializeRule'
      ruleId: Id<'rules'>
      ruleMonth: string
      date: string
      name: string
      kind: 'income' | 'expense'
      amount: number
    }
  | { type: 'confirmTx'; txId: Id<'transactions'> }
  | { type: 'deleteTx'; txId: Id<'transactions'> }
  | { type: 'postponeTx'; txId: Id<'transactions'>; newDate: string }
  | { type: 'insertActual'; date: string; name: string; kind: 'income' | 'expense'; amount: number }
  | { type: 'dropRuleAddons'; ruleId: Id<'rules'>; ruleMonth: string }

function signed(kind: 'income' | 'expense', amount: number): number {
  return kind === 'income' ? amount : -amount
}

type ReconcileMode = 'manual' | 'ocr'

// モード切替 + どちらかのフォームを表示する。key={anchorDate} で Drawer を開き直すたびに
// リセットされる（親の ReconcileDrawer 側で unmount/remount している）。
function ReconcileBody({
  currentBalance,
  anchorDate,
  anchorBalance,
  pendingRows,
  historyRows,
  onClose,
}: {
  currentBalance: number
  anchorDate: string
  anchorBalance: number
  pendingRows: ForecastRow[]
  historyRows: HistoryRow[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<ReconcileMode>('manual')

  return (
    <div className="flex flex-col gap-4">
      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[mode]}
        onSelectionChange={(keys) => {
          const value = Array.from(keys)[0]
          if (value === 'manual' || value === 'ocr') setMode(value)
        }}
      >
        <ToggleButton id="manual">手動</ToggleButton>
        <ToggleButton id="ocr">
          <ToggleButtonGroup.Separator />
          スクショから (Pro)
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'manual' ? (
        <ManualReconcileForm
          currentBalance={currentBalance}
          anchorBalance={anchorBalance}
          pendingRows={pendingRows}
          onClose={onClose}
        />
      ) : (
        <ProGate
          title="スクショから取り込み"
          description="銀行アプリの明細スクショからの取り込みはProプラン限定です"
        >
          <OcrReconcileForm
            anchorDate={anchorDate}
            anchorBalance={anchorBalance}
            periodRows={pendingRows}
            historyRows={historyRows}
            onClose={onClose}
          />
        </ProGate>
      )}
    </div>
  )
}

function ManualReconcileForm({
  currentBalance,
  anchorBalance,
  pendingRows,
  onClose,
}: {
  currentBalance: number
  anchorBalance: number
  pendingRows: ForecastRow[]
  onClose: () => void
}) {
  const commit = useMutation(api.reconcile.commit)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<number | undefined>(currentBalance)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<Record<string, RowAction>>(() =>
    Object.fromEntries(pendingRows.map((row) => [row.key, 'materialize' as RowAction])),
  )
  const [adjustChecked, setAdjustChecked] = useState(true)

  const newAnchorDate = todayJST()

  const reflectedBalance = useMemo(() => {
    let total = anchorBalance
    for (const row of pendingRows) {
      if (actions[row.key] === 'materialize') {
        total += signed(row.kind, row.amount)
      }
    }
    return total
  }, [pendingRows, actions, anchorBalance])

  const diff = balance !== undefined ? Math.round(balance) - reflectedBalance : 0

  const setAction = (key: string, action: RowAction) => {
    setActions((prev) => ({ ...prev, [key]: action }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (balance === undefined) {
      setError('残高を入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const roundedBalance = Math.round(balance)
      const finalDiff = roundedBalance - reflectedBalance

      const ops: ReconcileOp[] = []
      for (const row of pendingRows) {
        const action = actions[row.key] ?? 'materialize'
        if (action === 'materialize') {
          if (row.isVirtual) {
            if (row.ruleId === undefined || row.ruleMonth === undefined) continue
            ops.push({
              type: 'materializeRule',
              ruleId: row.ruleId,
              ruleMonth: row.ruleMonth,
              date: row.date,
              name: row.name,
              kind: row.kind,
              amount: row.amount,
            })
          } else if (row.txId !== undefined) {
            ops.push({ type: 'confirmTx', txId: row.txId })
          }
        } else if (action === 'delete') {
          if (row.txId !== undefined) ops.push({ type: 'deleteTx', txId: row.txId })
        } else if (action === 'postpone') {
          if (row.txId !== undefined) {
            ops.push({ type: 'postponeTx', txId: row.txId, newDate: addDays(newAnchorDate, 1) })
          }
        } else if (action === 'skip') {
          // 「記録しない」を選んだ仮想行に上乗せ(addon)が付いていた場合、そのまま放置すると
          // 基準日前進後に「幻の実績」としてDBに残ってしまうため、addon行ごと削除する。
          if (row.isVirtual && row.ruleId !== undefined && row.ruleMonth !== undefined && (row.addons?.length ?? 0) > 0) {
            ops.push({ type: 'dropRuleAddons', ruleId: row.ruleId, ruleMonth: row.ruleMonth })
          }
        }
      }

      if (finalDiff !== 0 && adjustChecked) {
        ops.push({
          type: 'insertActual',
          date: newAnchorDate,
          name: '残高調整',
          kind: finalDiff > 0 ? 'income' : 'expense',
          amount: Math.abs(finalDiff),
        })
      }

      await commit({
        newAnchorDate,
        newAnchorBalance: roundedBalance,
        batchId: crypto.randomUUID(),
        ops,
      })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        銀行口座の現在残高を入力してください。過去の予定は実績として記録されます。
      </p>

      {pendingRows.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">基準日から今日までの予定・取引</span>
          <div className="flex flex-col divide-y divide-border">
            {pendingRows.map((row) => (
              <PendingRowItem
                key={row.key}
                row={row}
                action={actions[row.key] ?? 'materialize'}
                onChange={(action) => setAction(row.key, action)}
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">反映後残高</span>
          <span className="tabular-nums">{formatYen(reflectedBalance)}</span>
        </div>
        {diff !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted">ズレ</span>
            <span className={`tabular-nums ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {diff > 0 ? '+' : ''}
              {formatYen(diff)}
            </span>
          </div>
        )}
      </div>

      <NumberField
        isInvalid={error !== null}
        isDisabled={submitting}
        minValue={-1_000_000_000}
        maxValue={1_000_000_000}
        value={balance}
        onChange={setBalance}
        formatOptions={{ style: 'currency', currency: 'JPY' }}
      >
        <Label>現在残高</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="flex-1" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {error && <FieldError>{error}</FieldError>}
      </NumberField>

      {diff !== 0 && (
        <Checkbox isSelected={adjustChecked} onChange={setAdjustChecked} isDisabled={submitting}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            差額 {formatYen(Math.abs(diff))} を「残高調整」として記録する
          </Checkbox.Content>
        </Checkbox>
      )}

      <Button type="submit" isPending={submitting} isDisabled={submitting}>
        {submitting && <Spinner color="current" size="sm" />}
        保存
      </Button>
    </form>
  )
}

const MAX_OCR_IMAGES = 5

type OcrResult = { rows: ExtractedRow[]; skippedCount: number }

// スクショOCR取り込みモード。
// 1) 画像を選択・圧縮・アップロード → convex action で構造化抽出
// 2) クライアント側で既存の予定/確定/手入力行・実績とマッチング（ocrMatch.ts、純粋関数）
// 3) プレビューで確認 → 既存の reconcile.commit でアトミックにコミット
function OcrReconcileForm({
  anchorDate,
  anchorBalance,
  periodRows,
  historyRows,
  onClose,
}: {
  anchorDate: string
  anchorBalance: number
  periodRows: ForecastRow[] // anchorDate < date <= 今日 の予定/確定/手入力行（明細最終日以降は呼び出し側で絞る）
  historyRows: HistoryRow[]
  onClose: () => void
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const cleanupFiles = useMutation(api.files.cleanup)
  const extractStatement = useAction(api.ocr.extractStatement)
  const commit = useMutation(api.reconcile.commit)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [result, setResult] = useState<OcrResult | null>(null)
  const [matches, setMatches] = useState<OcrMatch[]>([])
  const [unmatchedPeriodRows, setUnmatchedPeriodRows] = useState<ForecastRow[]>([])
  const [matchSelected, setMatchSelected] = useState<Record<number, boolean>>({})
  const [unmatchedActions, setUnmatchedActions] = useState<Record<string, RowAction>>({})
  const [newAnchorBalance, setNewAnchorBalance] = useState<number | undefined>(undefined)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [adjustChecked, setAdjustChecked] = useState(true)

  const chainWarnings = useMemo(() => (result ? validateBalanceChain(result.rows) : []), [result])

  const newAnchorDate = useMemo(() => {
    if (!result || result.rows.length === 0) return anchorDate
    return result.rows.reduce((max, row) => (row.date > max ? row.date : max), anchorDate)
  }, [result, anchorDate])

  const reflectedBalance = useMemo(() => {
    let total = anchorBalance
    matches.forEach((m, index) => {
      if (m.type === 'outOfRange') return
      if (matchSelected[index]) {
        total += signed(m.extracted.kind, m.extracted.amount)
      }
    })
    for (const row of unmatchedPeriodRows) {
      if (unmatchedActions[row.key] === 'materialize') {
        total += signed(row.kind, row.amount)
      }
    }
    return total
  }, [matches, matchSelected, unmatchedPeriodRows, unmatchedActions, anchorBalance])

  const diff = newAnchorBalance !== undefined ? Math.round(newAnchorBalance) - reflectedBalance : 0

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    // 表示は React state 側の files を出典にするため、同じファイルを選び直せるよう
    // ネイティブ input の内部状態はここでリセットしておく（iOS等でinput自体のラベル表示には依存しない）。
    e.target.value = ''
    if (selected.length === 0) return
    if (selected.length > MAX_OCR_IMAGES) {
      setFileError('一度に選べるのはスクショ5枚までです')
      setFiles([])
      setResult(null)
      return
    }
    setFileError(null)
    setFiles(selected)
    setResult(null)
  }

  const handleClearFiles = () => {
    setFiles([])
    setFileError(null)
    setResult(null)
  }

  const handleExtract = async () => {
    if (files.length === 0 || files.length > MAX_OCR_IMAGES) return
    setExtracting(true)
    const storageIds: Id<'_storage'>[] = []
    // extractStatement 呼び出しに実際に到達したかどうか。到達していれば、途中で失敗しても
    // action側の finally が storageIds を必ず削除するため、ここでの後始末は不要になる。
    let reachedExtract = false
    try {
      for (const file of files) {
        const blob = await compressImage(file)
        const uploadUrl = await generateUploadUrl({})
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob,
        })
        if (!res.ok) {
          throw new Error('画像のアップロードに失敗しました')
        }
        const json = (await res.json()) as { storageId: Id<'_storage'> }
        storageIds.push(json.storageId)
      }

      reachedExtract = true
      const extracted = await extractStatement({ storageIds })

      const maxDate = extracted.rows.reduce((max, row) => (row.date > max ? row.date : max), anchorDate)
      const periodRowsForMatch = periodRows.filter((row) => row.date <= maxDate)
      const historyForMatch = historyRows.map((h) => ({ date: h.date, kind: h.kind, amount: h.amount }))

      const built = matchExtractedRows({
        extracted: extracted.rows,
        periodRows: periodRowsForMatch,
        historyRows: historyForMatch,
        anchorDate,
      })

      const initialSelected: Record<number, boolean> = {}
      built.matches.forEach((m, index) => {
        if (m.type === 'existing' || m.type === 'new') initialSelected[index] = true
        if (m.type === 'duplicateSuspect') initialSelected[index] = false
      })

      const initialUnmatchedActions: Record<string, RowAction> = {}
      for (const row of built.unmatchedPeriodRows) {
        // 明細に現れなかった予定は「起きなかった可能性が高い」が、勝手に確定・削除はしない。
        // 仮想行は「記録しない」(skip) を、実体行（すでに作成済みの手入力・上書き行）は
        // 削除しない非破壊的な「先送り」をデフォルトにする（実体行にはskip相当の選択肢が無いため）。
        initialUnmatchedActions[row.key] = row.isVirtual ? 'skip' : 'postpone'
      }

      const rowsAtMaxDate = extracted.rows.filter((row) => row.date === maxDate)
      const lastRow = rowsAtMaxDate[rowsAtMaxDate.length - 1]

      setResult(extracted)
      setMatches(built.matches)
      setUnmatchedPeriodRows(built.unmatchedPeriodRows)
      setMatchSelected(initialSelected)
      setUnmatchedActions(initialUnmatchedActions)
      setNewAnchorBalance(lastRow?.balanceAfter)
      setBalanceError(null)
    } catch (err) {
      // extractStatement に到達する前（アップロード段階）で失敗した場合、その action の
      // finally は一度も走らないため、アップロード済みの storageId が誰にも削除されないまま
      // 残ってしまう（銀行スクショの残留はプライバシー上避けたい）。ここで明示的に後始末する。
      // extractStatement に到達した後の失敗は、action側のfinallyで既に削除済みのはずなので
      // 二重処理を避けるためスキップする。
      if (!reachedExtract && storageIds.length > 0) {
        try {
          await cleanupFiles({ storageIds })
        } catch (cleanupErr) {
          console.error('OCR取り込み: アップロード済み画像の後始末に失敗しました', cleanupErr)
        }
      }
      notifyError(err, '取り込みに失敗しました')
    } finally {
      setExtracting(false)
    }
  }

  const handleCommit = async () => {
    if (!result || result.rows.length === 0) return
    // 抽出行が全て基準日以前（対象外）の場合、newAnchorDate は前進しない。
    // reconcile.commit は基準日を過去に戻せないため、ここで到達させず手前で弾く。
    if (newAnchorDate <= anchorDate) return
    if (newAnchorBalance === undefined) {
      setBalanceError('残高を入力してください')
      return
    }
    setBalanceError(null)
    setSubmitting(true)
    try {
      const roundedBalance = Math.round(newAnchorBalance)
      const finalDiff = roundedBalance - reflectedBalance

      const ops: ReconcileOp[] = []

      matches.forEach((m, index) => {
        if (m.type === 'outOfRange') return
        if (!matchSelected[index]) return

        if (m.type === 'new' || m.type === 'duplicateSuspect') {
          ops.push({
            type: 'insertActual',
            date: m.extracted.date,
            name: m.extracted.name,
            kind: m.extracted.kind,
            amount: m.extracted.amount,
          })
          return
        }

        // existing
        const row = m.row
        if (row.isVirtual) {
          if (row.ruleId === undefined || row.ruleMonth === undefined) return
          ops.push({
            type: 'materializeRule',
            ruleId: row.ruleId,
            ruleMonth: row.ruleMonth,
            date: m.extracted.date,
            name: row.name, // 予定名を維持する（extractedの名前は使わない）
            kind: m.extracted.kind,
            amount: m.extracted.amount,
          })
        } else if (row.txId !== undefined) {
          ops.push({ type: 'confirmTx', txId: row.txId })
        }
      })

      for (const row of unmatchedPeriodRows) {
        const action = unmatchedActions[row.key] ?? 'skip'
        if (action === 'materialize') {
          if (row.isVirtual) {
            if (row.ruleId === undefined || row.ruleMonth === undefined) continue
            ops.push({
              type: 'materializeRule',
              ruleId: row.ruleId,
              ruleMonth: row.ruleMonth,
              date: row.date,
              name: row.name,
              kind: row.kind,
              amount: row.amount,
            })
          } else if (row.txId !== undefined) {
            ops.push({ type: 'confirmTx', txId: row.txId })
          }
        } else if (action === 'delete') {
          if (row.txId !== undefined) ops.push({ type: 'deleteTx', txId: row.txId })
        } else if (action === 'postpone') {
          if (row.txId !== undefined) {
            ops.push({ type: 'postponeTx', txId: row.txId, newDate: addDays(newAnchorDate, 1) })
          }
        } else if (action === 'skip') {
          if (row.isVirtual && row.ruleId !== undefined && row.ruleMonth !== undefined && (row.addons?.length ?? 0) > 0) {
            ops.push({ type: 'dropRuleAddons', ruleId: row.ruleId, ruleMonth: row.ruleMonth })
          }
        }
      }

      if (finalDiff !== 0 && adjustChecked) {
        ops.push({
          type: 'insertActual',
          date: newAnchorDate,
          name: '残高調整',
          kind: finalDiff > 0 ? 'income' : 'expense',
          amount: Math.abs(finalDiff),
        })
      }

      await commit({
        newAnchorDate,
        newAnchorBalance: roundedBalance,
        batchId: crypto.randomUUID(),
        ops,
      })
      notifySaved()
      onClose()
    } catch (err) {
      notifyError(err, '残高の更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const indexed = matches.map((m, index) => ({ m, index }))
  const existingEntries = indexed.filter((e) => e.m.type === 'existing')
  const newEntries = indexed.filter((e) => e.m.type === 'new')
  const duplicateEntries = indexed.filter((e) => e.m.type === 'duplicateSuspect')
  const outOfRangeCount = indexed.filter((e) => e.m.type === 'outOfRange').length

  const busy = extracting || submitting

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        銀行アプリの入出金明細のスクリーンショットを1〜5枚アップロードしてください。
        スクショはGoogleのAIで解析され、解析後すぐ削除されます。
      </p>

      <div className="flex flex-col gap-2">
        {/* ネイティブ input のラベル表示（iOS等で「ファイル未選択」のまま更新されないことがある）には
            依存しない。選択状態は files state から描画し、input 自体は非表示にして ref 経由で開く。 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" onPress={() => fileInputRef.current?.click()} isDisabled={busy}>
            ファイルを選択
          </Button>
          <div className="min-w-0 flex-1 text-sm text-muted">
            {files.length === 0 ? (
              '未選択'
            ) : (
              <span className="block truncate">
                {files.length}枚選択中: {files.map((f) => f.name).join(', ')}
              </span>
            )}
          </div>
          {files.length > 0 && (
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              aria-label="選択を解除"
              onPress={handleClearFiles}
              isDisabled={busy}
            >
              ✕
            </Button>
          )}
        </div>
        {fileError && <p className="text-xs text-danger">{fileError}</p>}
        <Button variant="secondary" onPress={handleExtract} isPending={extracting} isDisabled={busy || files.length === 0}>
          {extracting && <Spinner color="current" size="sm" />}
          取り込む
        </Button>
      </div>

      {result && (
        <>
          <Separator />

          {(chainWarnings.length > 0 || result.skippedCount > 0) && (
            <div className="flex flex-col gap-1 rounded-lg bg-warning-soft p-3 text-xs text-warning">
              {result.skippedCount > 0 && <p>{result.skippedCount}件の行を読み取れなかったため除外しました。</p>}
              {chainWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          {result.rows.length === 0 ? (
            <p className="text-sm text-muted">取引を検出できませんでした。別のスクショで試してください。</p>
          ) : newAnchorDate <= anchorDate ? (
            <p className="text-sm text-muted">
              この明細はすべて基準日以前の内容です。取り込むものがありません。
            </p>
          ) : (
            <>
              {existingEntries.length > 0 && (
                <MatchSection
                  title="予定と一致"
                  entries={existingEntries}
                  selected={matchSelected}
                  onToggle={(index, checked) => setMatchSelected((prev) => ({ ...prev, [index]: checked }))}
                  disabled={submitting}
                />
              )}

              {newEntries.length > 0 && (
                <MatchSection
                  title="新しい実績"
                  entries={newEntries}
                  selected={matchSelected}
                  onToggle={(index, checked) => setMatchSelected((prev) => ({ ...prev, [index]: checked }))}
                  disabled={submitting}
                />
              )}

              {duplicateEntries.length > 0 && (
                <MatchSection
                  title="重複の疑い"
                  note="すでに取り込み済みの可能性があります"
                  entries={duplicateEntries}
                  selected={matchSelected}
                  onToggle={(index, checked) => setMatchSelected((prev) => ({ ...prev, [index]: checked }))}
                  disabled={submitting}
                />
              )}

              {outOfRangeCount > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted">対象外</span>
                  <p className="text-xs text-muted">{outOfRangeCount}件（基準日以前のため対象外）</p>
                </div>
              )}

              {unmatchedPeriodRows.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">消化されなかった予定</span>
                  <div className="flex flex-col divide-y divide-border">
                    {unmatchedPeriodRows.map((row) => (
                      <PendingRowItem
                        key={row.key}
                        row={row}
                        action={unmatchedActions[row.key] ?? 'skip'}
                        onChange={(action) => setUnmatchedActions((prev) => ({ ...prev, [row.key]: action }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">反映後残高</span>
                  <span className="tabular-nums">{formatYen(reflectedBalance)}</span>
                </div>
                {diff !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">ズレ</span>
                    <span className={`tabular-nums ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {diff > 0 ? '+' : ''}
                      {formatYen(diff)}
                    </span>
                  </div>
                )}
              </div>

              <NumberField
                isInvalid={balanceError !== null}
                isDisabled={submitting}
                minValue={-1_000_000_000}
                maxValue={1_000_000_000}
                value={newAnchorBalance}
                onChange={setNewAnchorBalance}
                formatOptions={{ style: 'currency', currency: 'JPY' }}
              >
                <Label>新しい基準日（{formatDateShort(newAnchorDate)}）の残高</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="flex-1" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
                {balanceError && <FieldError>{balanceError}</FieldError>}
              </NumberField>

              {diff !== 0 && (
                <Checkbox isSelected={adjustChecked} onChange={setAdjustChecked} isDisabled={submitting}>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    差額 {formatYen(Math.abs(diff))} を「残高調整」として記録する
                  </Checkbox.Content>
                </Checkbox>
              )}

              <Button onPress={handleCommit} isPending={submitting} isDisabled={submitting}>
                {submitting && <Spinner color="current" size="sm" />}
                保存
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function MatchSection({
  title,
  note,
  entries,
  selected,
  onToggle,
  disabled,
}: {
  title: string
  note?: string
  entries: { m: OcrMatch; index: number }[]
  selected: Record<number, boolean>
  onToggle: (index: number, checked: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">
        {title} <span className="text-muted">{entries.length}件</span>
      </span>
      {note && <p className="text-xs text-muted">{note}</p>}
      <div className="flex flex-col divide-y divide-border">
        {entries.map(({ m, index }) => {
          if (m.type === 'outOfRange') return null
          const extracted = m.extracted
          const amountColor = extracted.kind === 'expense' ? 'text-red-600' : 'text-blue-600'
          const amountSign = extracted.kind === 'expense' ? '-' : '+'
          return (
            <label key={index} className="flex items-start justify-between gap-2 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected[index] ?? false}
                  disabled={disabled}
                  onChange={(e) => onToggle(index, e.target.checked)}
                />
                <div className="flex min-w-0 flex-col gap-0">
                  <div className="flex items-baseline gap-2">
                    <span className="w-10 shrink-0 text-sm text-muted">{formatDateShort(extracted.date)}</span>
                    <span className="truncate text-sm">{extracted.name}</span>
                  </div>
                  {m.type === 'existing' && (
                    <span className="text-xs text-muted">対応: {m.row.name}</span>
                  )}
                </div>
              </div>
              <span className={`shrink-0 text-sm tabular-nums ${amountColor}`}>
                {amountSign}
                {formatYen(extracted.amount)}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function PendingRowItem({
  row,
  action,
  onChange,
}: {
  row: ForecastRow
  action: RowAction
  onChange: (action: RowAction) => void
}) {
  const amountColor = row.kind === 'expense' ? 'text-red-600' : 'text-blue-600'
  const amountSign = row.kind === 'expense' ? '-' : '+'

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="w-10 shrink-0 text-sm text-muted">{formatDateShort(row.date)}</span>
          <span className="truncate text-sm">{row.name}</span>
        </div>
        <span className={`shrink-0 text-sm tabular-nums ${amountColor}`}>
          {amountSign}
          {formatYen(row.amount)}
        </span>
      </div>
      {row.isVirtual ? (
        <ToggleButtonGroup
          selectionMode="single"
          disallowEmptySelection
          size="sm"
          selectedKeys={[action]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0]
            if (value === 'materialize' || value === 'skip') onChange(value)
          }}
        >
          <ToggleButton id="materialize">実績にする</ToggleButton>
          <ToggleButton id="skip">
            <ToggleButtonGroup.Separator />
            記録しない
          </ToggleButton>
        </ToggleButtonGroup>
      ) : (
        <ToggleButtonGroup
          selectionMode="single"
          disallowEmptySelection
          size="sm"
          selectedKeys={[action]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0]
            if (value === 'materialize' || value === 'delete' || value === 'postpone') onChange(value)
          }}
        >
          <ToggleButton id="materialize">実績にする</ToggleButton>
          <ToggleButton id="delete">
            <ToggleButtonGroup.Separator />
            削除
          </ToggleButton>
          <ToggleButton id="postpone">
            <ToggleButtonGroup.Separator />
            先送り
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </div>
  )
}
