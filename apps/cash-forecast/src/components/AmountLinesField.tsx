import { useState } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import type { Kind } from '../lib/money'
import {
  createAmountLine,
  sumAmountLines,
  type AmountLine,
} from '../lib/amountLines'
import { KindYen, kindTone } from './Amount'
import { MoneyField } from './MoneyField'

type AmountLinesFieldProps = {
  lines: AmountLine[]
  onChange: (lines: AmountLine[]) => void
  /** 合計・各項目の符号と色に使う */
  kind: Kind
  error?: string
  isDisabled?: boolean
}

/**
 * 取引の金額欄。項目が無いうちは金額1つの入力欄。
 * 項目を足すと、上乗せの詳細ビュー（RuleMonthDetail）と同じく
 * 「大きな合計 → 項目ごとの行（編集・削除）→ 追加ボタン」の並びになり、項目は1行ずつ開いて編集する。
 */
export function AmountLinesField({ lines, onChange, kind, error, isDisabled }: AmountLinesFieldProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const total = sumAmountLines(lines)
  // ラベル付きの1行も内訳として見せる（保存済みの項目名を隠さない）。
  // 編集中は、項目名を消しても入力欄が単一表示に切り替わらないようにする
  const itemized = lines.length > 1 || (lines[0]?.label ?? '') !== '' || editingId !== null

  const setLineValue = (id: string, value: number | undefined) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, value } : line)))
  }

  const setLineLabel = (id: string, label: string) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, label } : line)))
  }

  const addLine = () => {
    const line = createAmountLine()
    onChange([...lines, line])
    setEditingId(line.id)
  }

  const removeLine = (id: string) => {
    if (lines.length <= 1) return
    onChange(lines.filter((line) => line.id !== id))
    if (editingId === id) setEditingId(null)
  }

  if (!itemized) {
    const line = lines[0]
    return (
      <div className="flex flex-col gap-2">
        {line && (
          <MoneyField
            className="w-full"
            label="金額"
            value={line.value}
            onChange={(value) => setLineValue(line.id, value)}
            error={error}
            isDisabled={isDisabled}
          />
        )}
        <Button className="self-start" variant="secondary" size="sm" onPress={addLine} isDisabled={isDisabled}>
          ＋項目を追加
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">合計</span>
        {total === undefined ? (
          <span className="text-sm text-muted">—（保存時に合算）</span>
        ) : (
          <span className={`text-2xl font-bold tabular-nums ${kindTone(kind)}`}>
            <KindYen kind={kind} amount={total} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {lines.map((line, index) => {
          const n = index === 0 ? '' : ` ${index + 1}`
          if (editingId === line.id) {
            return (
              <div key={line.id} className="flex flex-col gap-2 rounded-xl bg-surface-secondary p-3">
                <TextField isDisabled={isDisabled}>
                  <Label>{`項目名${n}`}</Label>
                  <Input
                    placeholder="任意"
                    value={line.label}
                    onChange={(e) => setLineLabel(line.id, e.target.value)}
                  />
                </TextField>
                <MoneyField
                  className="w-full"
                  label={`金額${n}`}
                  value={line.value}
                  onChange={(value) => setLineValue(line.id, value)}
                  isDisabled={isDisabled}
                  showFormattedPreview={false}
                />
                <div className="flex justify-end gap-2">
                  {lines.length > 1 && (
                    <Button variant="tertiary" size="sm" isDisabled={isDisabled} onPress={() => removeLine(line.id)}>
                      削除
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" isDisabled={isDisabled} onPress={() => setEditingId(null)}>
                    完了
                  </Button>
                </div>
              </div>
            )
          }
          return (
            <div key={line.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-muted">
                {line.label !== '' ? line.label : `項目${index + 1}`}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-sm tabular-nums ${line.value === undefined ? 'text-muted' : kindTone(kind)}`}>
                  {line.value === undefined ? '未入力' : <KindYen kind={kind} amount={line.value} />}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  isDisabled={isDisabled}
                  aria-label={`編集${n}`}
                  onPress={() => setEditingId(line.id)}
                >
                  編集
                </Button>
                {lines.length > 1 && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    isDisabled={isDisabled}
                    aria-label={`削除${n}`}
                    onPress={() => removeLine(line.id)}
                  >
                    削除
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Button className="self-start" variant="secondary" onPress={addLine} isDisabled={isDisabled}>
        ＋項目を追加
      </Button>

      {error !== undefined && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
