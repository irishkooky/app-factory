import { Button } from '@heroui/react'
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
  error?: string
  isDisabled?: boolean
}

export function AmountLinesField({ lines, onChange, error, isDisabled }: AmountLinesFieldProps) {
  const total = sumAmountLines(lines)
  const showTotal = lines.length > 1

  const setLineValue = (id: string, value: number | undefined) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, value } : line)))
  }

  const addLine = () => {
    onChange([...lines, createAmountLine()])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 1) return
    onChange(lines.filter((line) => line.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={line.id} className="flex items-start gap-2">
          <MoneyField
            className="min-w-0 flex-1"
            label={index === 0 ? '金額' : `金額 ${index + 1}`}
            value={line.value}
            onChange={(value) => setLineValue(line.id, value)}
            error={lines.length === 1 && index === 0 ? error : undefined}
            isDisabled={isDisabled}
          />
          {lines.length > 1 && (
            <Button
              className="mt-6 shrink-0"
              variant="tertiary"
              size="sm"
              isDisabled={isDisabled}
              aria-label="削除"
              onPress={() => removeLine(line.id)}
            >
              削除
            </Button>
          )}
        </div>
      ))}

      <Button variant="secondary" size="sm" onPress={addLine} isDisabled={isDisabled}>
        項目を追加
      </Button>

      {showTotal && (
        <p className="text-sm text-muted tabular-nums">
          {total === undefined ? '合計 —（保存時に合算）' : `合計 ${formatYen(total)}（この金額で保存）`}
        </p>
      )}

      {error !== undefined && lines.length > 1 && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
