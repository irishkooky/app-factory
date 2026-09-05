import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { CloseButton, FieldError, InputGroup, Label, TextField } from '@heroui/react'
import { caretAfterDigits, countMoneyDigits, formatMoneyInput, toMoneyInputDisplay } from '../lib/money'

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
  // 変わったときだけ text を作り直すために使う。ref ではなく state で持つ（React公式の
  // 「props から派生した state を調整する」パターンに合わせる）。ref だと、並行レンダーで
  // そのレンダーが破棄されたときにロールバックされず、「ref だけ新値・text は旧値」のまま
  // 永久に同期しなくなる可能性がある。
  const [prevValue, setPrevValue] = useState(value)
  const caretRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // レンダー中に props から派生した state を調整するパターン（React公式）。
  // 比較に Object.is を使うのは、NaN !== NaN が常に true になり、value が NaN のときに
  // 毎レンダー setText が走って "Too many re-renders" でクラッシュするのを防ぐため
  // （=== / !== だと NaN 同士は「変わった」と誤判定されてしまう）。
  if (!Object.is(value, prevValue)) {
    setPrevValue(value)
    setText(toMoneyInputDisplay(value))
  }

  useIsomorphicLayoutEffect(() => {
    const el = inputRef.current
    if (caretRef.current === null || !el) return
    const pos = caretRef.current
    caretRef.current = null
    // text/prevValue が変わらず再レンダーが起きなかった場合、この effect 自体は走らない
    // （呼び出し元の applyRaw が自前で復元する）。ここではフォーカスが外れている間に
    // 古いキャレット位置が残っていて、無関係な再レンダー（Convexのライブクエリ更新等）で
    // 誤った位置に飛ぶのを防ぐため、フォーカス中だけ復元する。
    if (document.activeElement === el) el.setSelectionRange(pos, pos)
  })

  // raw な入力文字列とその中でのキャレット位置から、正規化・状態更新・キャレット復元までを行う。
  // handleChange と onKeyDown（カンマまたぎ削除の振り替え）の両方から呼ばれる共通処理。
  const applyRaw = (raw: string, caretInRaw: number) => {
    const digitsBefore = countMoneyDigits(raw.slice(0, caretInRaw))
    const next = formatMoneyInput(raw, { allowNegative, maxValue })
    const caret = caretAfterDigits(next.display, digitsBefore)

    if (next.display === text && Object.is(next.value, prevValue)) {
      // display も value も前回と同じ = state が変わらないので再レンダーが起きず、
      // 上のキャレット復元 effect も走らない。それでも React はコントロールド入力として
      // DOM の value を text に書き戻すため、キャレットが末尾に飛んでしまう。
      // ここで自前でキャレットを戻す（DOMの書き戻し後に実行するため queueMicrotask を使う）。
      const el = inputRef.current
      queueMicrotask(() => {
        el?.setSelectionRange(caret, caret)
      })
      return
    }

    caretRef.current = caret
    setPrevValue(next.value)
    setText(next.display)
    onChange(next.value)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    applyRaw(el.value, el.selectionStart ?? el.value.length)
  }

  // 桁区切りのカンマをまたぐ削除は、既定動作だと「カンマの手前/次の数字」ではなく
  // カンマ自体を消そうとして見かけ上なにも変化せず、キャレットが末尾に飛ぶ不具合になる。
  // カンマをまたぐ Backspace / Delete だけを「隣の数字を消す」に振り替える
  // （'-' はここでは対象にしない。マイナス記号上の Backspace は符号を消す既定動作でよい）。
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    if (start === null || end === null || start !== end) return

    if (e.key === 'Backspace' && start >= 2 && el.value[start - 1] === ',') {
      // カンマの直後で Backspace → カンマの手前の数字を消す
      e.preventDefault()
      applyRaw(el.value.slice(0, start - 2) + el.value.slice(start - 1), start - 2)
    } else if (e.key === 'Delete' && el.value[start] === ',') {
      // カンマの直前で Delete → カンマの次の数字を消す
      e.preventDefault()
      applyRaw(el.value.slice(0, start) + el.value.slice(start + 2), start)
    }
  }

  const handleClear = () => {
    setPrevValue(undefined)
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
          // iPhoneのソフトキーボードは numeric/decimal のどちらにもマイナスキーが無いため、
          // 負数を許可するフィールドでは text キーボード（フルキーボード）に切り替える。
          inputMode={allowNegative ? 'text' : 'numeric'}
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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
