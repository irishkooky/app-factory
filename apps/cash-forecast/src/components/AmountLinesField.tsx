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
  const multi = lines.length > 1

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
    <div className="flex flex-col gap-3">
      {lines.map((line, index) => (
        <MoneyField
          key={line.id}
          className="w-full"
          label={index === 0 ? '金額' : `金額 ${index + 1}`}
          value={line.value}
          onChange={(value) => setLineValue(line.id, value)}
          error={!multi && index === 0 ? error : undefined}
          isDisabled={isDisabled}
          // 複数行では行ごとの整形プレビューが次ラベルと密着し、合計と二重になるので隠す
          showFormattedPreview={!multi}
          labelAside={
            multi ? (
              <Button
                variant="tertiary"
                size="sm"
                isDisabled={isDisabled}
                aria-label="削除"
                onPress={() => removeLine(line.id)}
              >
                削除
              </Button>
            ) : undefined
          }
        />
      ))}

      <div className="flex w-full flex-col gap-2">
        <Button className="w-full" variant="secondary" onPress={addLine} isDisabled={isDisabled}>
          項目を追加
        </Button>

        {multi && (
          <div className="flex w-full items-baseline justify-between gap-3 text-sm">
            <span className="shrink-0 text-muted">合計</span>
            <span className="text-right tabular-nums">
              {total === undefined ? '—（保存時に合算）' : `${formatYen(total)}（この金額で保存）`}
            </span>
          </div>
        )}

        {error !== undefined && multi && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
