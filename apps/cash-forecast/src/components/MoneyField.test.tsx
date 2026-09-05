import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoneyField } from './MoneyField'

// vitest.config.ts は globals:false のため、@testing-library/react の自動 afterEach cleanup が
// 効かない（globals:true か jest グローバル検出が無いと登録されない）。各 it の render() が
// document.body に蓄積して "複数要素が見つかる" 事故になるため、明示的に cleanup する。
afterEach(cleanup)

// MoneyField は「親からの value 変更に追従する」同期処理を持つため、value を保持しない
// 呼び出し方（<MoneyField value={undefined} onChange={fn}>）だと毎打鍵で表示がリセットされて
// しまう。実際の利用形態に合わせ、必ず useState で値を保持する Harness を挟んでテストする。
function Harness({
  initial,
  allowNegative,
}: {
  initial?: number
  allowNegative?: boolean
}) {
  const [value, setValue] = useState<number | undefined>(initial)
  const [error, setError] = useState<string | undefined>()
  return (
    <>
      <MoneyField
        label="金額"
        value={value}
        onChange={(v) => {
          setValue(v)
          if (v !== undefined) setError(undefined)
        }}
        error={error}
        allowNegative={allowNegative}
      />
      <span data-testid="value">{String(value)}</span>
      <button type="button" onClick={() => setError(value === undefined ? '金額を入力してください' : undefined)}>
        送信
      </button>
      <button type="button" onClick={() => setValue(50000)}>
        差し替え
      </button>
    </>
  )
}

function getInput(): HTMLInputElement {
  return screen.getByRole('textbox', { name: '金額' }) as HTMLInputElement
}

// react-aria の CloseButton は onPress（ポインターイベント経由）で発火する。
// userEvent.click は jsdom 上でもポインターイベント一式を発火するため問題なく動く。
async function clickClear(user: ReturnType<typeof userEvent.setup>) {
  const button = screen.getByRole('button', { name: 'クリア' })
  await user.click(button)
}

// onChange の呼び出し回数を数えたいテスト専用の Harness。値の保持自体は
// Harness と同じく useState で行い、呼び出しのたびに外側の spy にも通知する。
function SpyHarness({ onChangeCalled }: { onChangeCalled: (value: number | undefined) => void }) {
  const [value, setValue] = useState<number | undefined>(undefined)
  return (
    <MoneyField
      label="金額"
      value={value}
      onChange={(v) => {
        setValue(v)
        onChangeCalled(v)
      }}
    />
  )
}

describe('MoneyField', () => {
  it('初期値: カンマ無しの数字がそのまま表示され、読みにカンマ区切りが出る', () => {
    render(<Harness initial={1000000} />)
    expect(getInput().value).toBe('1000000')
    expect(screen.getByText('¥1,000,000')).toBeTruthy()
  })

  it('打鍵中は入力欄を書き換えない。blur で正規化される', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()

    await user.type(input, '1234')
    expect(input.value).toBe('1234')
    expect(screen.getByTestId('value').textContent).toBe('1234')

    await user.type(input, ',')
    expect(input.value).toBe('1234,')
    expect(screen.getByTestId('value').textContent).toBe('1234')

    await user.tab()
    expect(input.value).toBe('1234')
  })

  it('全角数字はそのまま表示され、パース結果は半角の値になる。blur で半角に正規化される', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()

    await user.type(input, '１２３')
    expect(input.value).toBe('１２３')
    expect(screen.getByTestId('value').textContent).toBe('123')
    expect(screen.getByText('¥123')).toBeTruthy()

    await user.tab()
    expect(input.value).toBe('123')
  })

  it('不正入力: blur するまでエラーは出ない。blur で表示され、修正すると消える', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()

    await user.type(input, '12a')
    expect(screen.getByTestId('value').textContent).toBe('undefined')
    expect(screen.queryByText('半角数字で入力してください')).toBeNull()

    await user.tab()
    expect(screen.getByText('半角数字で入力してください')).toBeTruthy()

    input.focus()
    await user.type(input, '{backspace}')
    expect(screen.queryByText('半角数字で入力してください')).toBeNull()
    expect(screen.getByTestId('value').textContent).toBe('12')
  })

  it('クリアボタン: 押すと空になりフォーカスが入力欄に戻る。空のときは表示されない', async () => {
    const user = userEvent.setup()
    render(<Harness initial={500} />)
    const input = getInput()

    expect(screen.getByRole('button', { name: 'クリア' })).toBeTruthy()

    await clickClear(user)
    expect(input.value).toBe('')
    expect(screen.getByTestId('value').textContent).toBe('undefined')
    expect(document.activeElement).toBe(input)
    expect(screen.queryByRole('button', { name: 'クリア' })).toBeNull()
  })

  it('負数: allowNegative なら通り、既定では通らずエラーになる', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness allowNegative />)
    const negInput = getInput()
    await user.type(negInput, '-2500')
    expect(screen.getByTestId('value').textContent).toBe('-2500')
    expect(screen.getByText('-¥2,500')).toBeTruthy()
    unmount()

    render(<Harness />)
    const input = getInput()
    await user.type(input, '-300')
    expect(screen.getByTestId('value').textContent).toBe('undefined')
    await user.tab()
    expect(screen.getByText('0以上の金額を入力してください')).toBeTruthy()
  })

  it('上限超過: blur で専用のエラーになる', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()
    await user.type(input, '9999999999')
    await user.tab()
    expect(screen.getByText('10億円以下で入力してください')).toBeTruthy()
  })

  it('親のエラーと内部エラー: 内部エラーが優先され、値が入ると消える', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()

    await user.click(screen.getByRole('button', { name: '送信' }))
    expect(screen.getByText('金額を入力してください')).toBeTruthy()

    await user.type(input, '5')
    expect(screen.queryByText('金額を入力してください')).toBeNull()

    await user.clear(input)
    await user.type(input, 'abc')
    await user.click(screen.getByRole('button', { name: '送信' }))
    expect(screen.getByText('半角数字で入力してください')).toBeTruthy()
    expect(screen.queryByText('金額を入力してください')).toBeNull()
  })

  it('inputMode: allowNegative で text、既定で numeric', () => {
    const { unmount } = render(<Harness allowNegative />)
    expect(getInput().getAttribute('inputMode')).toBe('text')
    unmount()

    render(<Harness />)
    expect(getInput().getAttribute('inputMode')).toBe('numeric')
  })

  it('親からの値の差し替えに追従する', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = getInput()
    await user.click(screen.getByRole('button', { name: '差し替え' }))
    expect(input.value).toBe('50000')
  })

  it('blur では onChange が追加発火しない', async () => {
    const user = userEvent.setup()
    const onChangeCalled = vi.fn()
    render(<SpyHarness onChangeCalled={onChangeCalled} />)
    const input = getInput()

    await user.type(input, '1234')
    const countAfterTyping = onChangeCalled.mock.calls.length
    expect(countAfterTyping).toBeGreaterThan(0)

    await user.tab()
    expect(onChangeCalled.mock.calls.length).toBe(countAfterTyping)
  })
})
