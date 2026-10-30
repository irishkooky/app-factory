import type { ReactNode } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { formatYen } from '../lib/money'
import {
  createAmountLine,
  sumAmountLines,
  type AmountLine,
} from '../lib/amountLines'
import { MoneyField } from './MoneyField'

type AmountLinesFieldProps = {
  lines: AmountLine[]
  onChange: (lines: AmountLine[]) => void
  /** 親（取引の名前）。カードの見出しに置き、項目行をその子として字下げして並べる */
  header?: ReactNode
  error?: string
  isDisabled?: boolean
}

export function AmountLinesField({ lines, onChange, header, error, isDisabled }: AmountLinesFieldProps) {
  const total = sumAmountLines(lines)
  const multi = lines.length > 1

  const setLineValue = (id: string, value: number | undefined) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, value } : line)))
  }

  const setLineLabel = (id: string, label: string) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, label } : line)))
  }

  const addLine = () => {
    onChange([...lines, createAmountLine()])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 1) return
    onChange(lines.filter((line) => line.id !== id))
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-secondary p-3">
      {header}

      {/* 左の罫線と字下げで、項目行が親（名前）の内訳であることを示す */}
      <div className="ml-1 flex flex-col gap-3 border-l-2 border-border pl-3">
        <span className="text-xs text-muted">内訳</span>
        {lines.map((line, index) => (
          <div key={line.id} className="flex items-start gap-1.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <TextField isDisabled={isDisabled}>
                {/* 行ごとの見出しは繰り返しになるので視覚的には隠し、プレースホルダで伝える */}
                <Label className="sr-only">{index === 0 ? '項目名' : `項目名 ${index + 1}`}</Label>
                <Input
                  placeholder="項目名（任意）"
                  value={line.label}
                  onChange={(e) => setLineLabel(line.id, e.target.value)}
                />
              </TextField>
              <MoneyField
                className="w-full"
                label={index === 0 ? '金額' : `金額 ${index + 1}`}
                hideLabel
                value={line.value}
                onChange={(value) => setLineValue(line.id, value)}
                error={!multi && index === 0 ? error : undefined}
                isDisabled={isDisabled}
                // 複数行では行ごとの整形プレビューが合計と二重になるので隠す
                showFormattedPreview={!multi}
              />
            </div>
            {multi && (
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                className="mt-1 shrink-0 text-muted"
                isDisabled={isDisabled}
                aria-label="削除"
                onPress={() => removeLine(line.id)}
              >
                <IconTrash size={16} />
              </Button>
            )}
          </div>
        ))}

        <Button
          className="self-start"
          variant="ghost"
          size="sm"
          onPress={addLine}
          isDisabled={isDisabled}
        >
          <IconPlus size={16} />
          項目を追加
        </Button>
      </div>

      {multi && (
        <div className="flex w-full items-baseline justify-between gap-3 border-t border-border pt-2">
          <span className="shrink-0 text-sm text-muted">合計</span>
          <span className="text-right">
            {total === undefined ? (
              <span className="text-sm text-muted">—（保存時に合算）</span>
            ) : (
              <>
                <span className="text-base font-semibold tabular-nums">{formatYen(total)}</span>
                <span className="text-xs text-muted">（この金額で保存）</span>
              </>
            )}
          </span>
        </div>
      )}

      {error !== undefined && multi && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
