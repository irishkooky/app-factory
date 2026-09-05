import { useRef, useState, type ChangeEvent } from 'react'
import { CloseButton, Description, FieldError, InputGroup, Label, TextField } from '@heroui/react'
import { formatYen, moneyInputErrorMessage, parseMoneyInput, toMoneyInputText } from '../lib/money'

type MoneyFieldProps = {
  label: string
  value: number | undefined
  /**
   * 受け取った値をそのまま親の state に保存すること。`?? 0` などで別の値に矯正すると、
   * 次のレンダーで「親からの value 同期」が働き、入力途中の文字列（空欄や "-" など）を
   * 矯正後の値で上書きしてしまう。
   */
  onChange: (value: number | undefined) => void
  /** エラーメッセージ。undefined ならエラー表示なし */
  error?: string
  isDisabled?: boolean
  /** 負数を許可（残高フィールド用）。既定 false */
  allowNegative?: boolean
  className?: string
}

export function MoneyField({
  label,
  value,
  onChange,
  error,
  isDisabled,
  allowNegative = false,
  className,
}: MoneyFieldProps) {
  const [text, setText] = useState(() => toMoneyInputText(value))
  // 「最後に自分が親へ通知した値」。親からの value が外部要因（フォームリセット等）で
  // 変わったときだけ text を作り直すために使う。
  const [prevValue, setPrevValue] = useState(value)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // レンダー中に props から派生した state を調整するパターン（React公式）。
  // 比較に Object.is を使うのは、NaN !== NaN が常に true になり、value が NaN のときに
  // 毎レンダー setText が走って "Too many re-renders" でクラッシュするのを防ぐため
  // （=== / !== だと NaN 同士は「変わった」と誤判定されてしまう）。
  if (!Object.is(value, prevValue)) {
    setPrevValue(value)
    setText(toMoneyInputText(value))
  }

  const parsed = parseMoneyInput(text, { allowNegative })
  // 入力途中の "-" のような一時的に不正な状態でも、blur するか親がエラーを立てるまでは
  // 即座にエラーを出さない。出すときは親の「金額を入力してください」より、より具体的な
  // 内部エラー（形式・符号・上限）を優先する。'empty'/'partial' は moneyInputErrorMessage が
  // undefined を返すので、ここで理由を絞り込まなくても自然にエラーは出ない。
  const internalError = !parsed.ok && (touched || error !== undefined) ? moneyInputErrorMessage(parsed.reason) : undefined
  const shownError = internalError ?? error

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value
    setText(raw)
    const r = parseMoneyInput(raw, { allowNegative })
    const next = r.ok ? r.value : undefined
    setPrevValue(next)
    onChange(next)
  }

  const handleBlur = () => {
    setTouched(true)
    const r = parseMoneyInput(text, { allowNegative })
    if (r.ok) {
      // 表示だけ正規化する（例: "１，２３４" → "1234"、"1234.56" → "1234"）。
      // パース失敗時はユーザーが直せるよう入力文字列をそのまま残す。
      setText(toMoneyInputText(r.value))
    }
  }

  const handleClear = () => {
    setText('')
    setTouched(false)
    setPrevValue(undefined)
    onChange(undefined)
    inputRef.current?.focus()
  }

  const canClear = text !== '' && !isDisabled

  return (
    <TextField className={className} isInvalid={shownError !== undefined} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Prefix>¥</InputGroup.Prefix>
        <InputGroup.Input
          ref={inputRef}
          className="flex-1 tabular-nums"
          type="text"
          // iPhoneのソフトキーボードは numeric/decimal のどちらにもマイナスキーが無いため、
          // 負数を許可するフィールドでは text キーボード（フルキーボード）に切り替える。
          inputMode={allowNegative ? 'text' : 'numeric'}
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {canClear && (
          <InputGroup.Suffix className="pr-1">
            <CloseButton aria-label="クリア" slot={null} onPress={handleClear} />
          </InputGroup.Suffix>
        )}
      </InputGroup>
      {parsed.ok && text !== '' && <Description>{formatYen(parsed.value)}</Description>}
      {shownError !== undefined && <FieldError>{shownError}</FieldError>}
    </TextField>
  )
}
