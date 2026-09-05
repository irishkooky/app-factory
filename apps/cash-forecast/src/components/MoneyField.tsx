import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { CloseButton, FieldError, InputGroup, Label, TextField } from '@heroui/react'
import { countMoneyDigits, formatMoneyInput, toMoneyInputDisplay } from '../lib/money'

type MoneyFieldProps = {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** エラーメッセージ。undefined ならエラー表示なし */
  error?: string
  isDisabled?: boolean
  /** 負数を許可（残高フィールド用）。既定 false */
  allowNegative?: boolean
  /** 上限。既定 1_000_000_000 */
  maxValue?: number
  className?: string
}

// TanStack Start は SSR されるため、サーバーで useLayoutEffect を呼ぶと
// 「did you mean useEffect?」警告が出る。クライアントでのみ useLayoutEffect を使う
// isomorphic layout effect（この判定はモジュール読み込み時に一度だけ行われ、
// サーバー/クライアントそれぞれの環境で安定する）。
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

// display の先頭から数えて digitCount 個目の数字の直後の位置を返す（キャレット復元用）。
// digitCount が 0 以下のときは最初の数字の直前の位置（数字が無ければ末尾）。
function caretAfterDigits(display: string, digitCount: number): number {
  if (digitCount <= 0) {
    const idx = display.search(/\d/)
    return idx === -1 ? display.length : idx
  }
  let seen = 0
  for (let i = 0; i < display.length; i++) {
    if (/\d/.test(display[i])) {
      seen++
      if (seen === digitCount) return i + 1
    }
  }
  return display.length
}

export function MoneyField({
  label,
  value,
  onChange,
  error,
  isDisabled,
  allowNegative = false,
  maxValue = 1_000_000_000,
  className,
}: MoneyFieldProps) {
  const [text, setText] = useState(() => toMoneyInputDisplay(value))
  // 「最後に自分が親へ通知した値」。親からの value が外部要因（フォームリセット等）で
  // 変わったときだけ text を作り直すために使う。
  const lastValueRef = useRef<number | undefined>(value)
  const caretRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // レンダー中に props から派生した state を調整するパターン（React公式）。
  if (value !== lastValueRef.current) {
    lastValueRef.current = value
    setText(toMoneyInputDisplay(value))
  }

  useIsomorphicLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      const pos = caretRef.current
      caretRef.current = null
      inputRef.current.setSelectionRange(pos, pos)
    }
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const raw = el.value
    const caret = el.selectionStart ?? raw.length
    const digitsBefore = countMoneyDigits(raw.slice(0, caret))
    const next = formatMoneyInput(raw, { allowNegative, maxValue })
    caretRef.current = caretAfterDigits(next.display, digitsBefore)
    lastValueRef.current = next.value
    setText(next.display)
    onChange(next.value)
  }

  const handleClear = () => {
    lastValueRef.current = undefined
    setText('')
    onChange(undefined)
    inputRef.current?.focus()
  }

  const canClear = text !== '' && !isDisabled

  return (
    <TextField className={className} isInvalid={error !== undefined} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Prefix>¥</InputGroup.Prefix>
        <InputGroup.Input
          ref={inputRef}
          className="flex-1 tabular-nums"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={handleChange}
        />
        {canClear && (
          <InputGroup.Suffix className="pr-1">
            <CloseButton aria-label="クリア" slot={null} onPress={handleClear} />
          </InputGroup.Suffix>
        )}
      </InputGroup>
      {error !== undefined && <FieldError>{error}</FieldError>}
    </TextField>
  )
}
