import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfImportDrawer, canSubmitPreview, isValidImportRow } from './PdfImportDrawer'

const previewQuery = vi.fn()
const mutation = vi.fn()
const queryState = vi.hoisted(() => ({ batches: [] as unknown[], details: [] as unknown[] }))
vi.mock('convex/react', () => ({
  useConvex: () => ({ query: previewQuery }),
  useMutation: () => mutation,
  useQuery: (_reference: unknown, args: unknown) => args === 'skip' ? undefined : (typeof args === 'object' && args !== null && 'batchId' in args ? queryState.details : queryState.batches),
}))
vi.mock('../lib/koukoPdf', async (original) => {
  const actual = await original<typeof import('../lib/koukoPdf')>()
  return { ...actual, sha256File: async () => 'a'.repeat(64), readKoukoPdf: async () => ({ loanKey: 'loan-1', era: '令和', warnings: [], rows: [{ installment: 1, sourceDate: '2026-07-31', date: '2026-07-31', name: '公庫返済', principal: 75_000, interest: 1_000, amount: 76_000, page: 1 }] }) }
})

beforeEach(() => { previewQuery.mockReset(); mutation.mockReset(); queryState.batches = []; queryState.details = [] })
afterEach(cleanup)
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  globalThis.ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {} }
})

const row = { installment: 1, sourceDate: '2028-01-01', date: '2028-01-04', name: '公庫返済', principal: 75_000, interest: 1_000, amount: 76_000, page: 1, selected: true, holidayUnconfirmed: true }

describe('PDF取込の登録条件', () => {
  it('全未選択と祝日未確認を拒否する', () => {
    expect(canSubmitPreview([{ ...row, selected: false }], '2026-01-01', 'loan', true, true)).toBe(false)
    expect(canSubmitPreview([row], '2026-01-01', 'loan', true, false)).toBe(false)
  })
  it('元号・識別子を明示確認した有効な明細だけ確認へ進める', () => {
    expect(canSubmitPreview([row], '2026-01-01', 'loan', true, true)).toBe(true)
    expect(canSubmitPreview([row], '2026-01-01', '', true, true)).toBe(false)
    expect(canSubmitPreview([row], '2026-01-01', 'loan', false, true)).toBe(false)
  })
  it('過去日と内訳不一致を拒否する', () => {
    expect(isValidImportRow({ ...row, date: '2025-12-31' }, '2026-01-01')).toBe(false)
    expect(isValidImportRow({ ...row, amount: 99_999 }, '2026-01-01')).toBe(false)
  })
})

describe('PdfImportDrawerの確認状態', () => {
  it('競合確認後に内容を編集すると古い確認と承認を破棄する', async () => {
    previewQuery.mockResolvedValue({ alreadyImported: false, rows: [{ installment: 1, status: 'conflict', canAcknowledge: true, message: '手入力と競合' }] })
    render(<PdfImportDrawer opened onClose={() => undefined} anchorDate="2026-06-01" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })] } })
    await screen.findByText('1件を抽出')
    await userEvent.click(screen.getByLabelText('PDFの年表記を「令和」として確認しました'))
    await userEvent.click(screen.getByRole('button', { name: '重複を確認' }))
    const acknowledge = await screen.findByLabelText('確認して追加')
    await userEvent.click(acknowledge)
    await userEvent.clear(screen.getByLabelText('1回目の名称'))
    await userEvent.type(screen.getByLabelText('1回目の名称'), '変更後')
    expect(screen.queryByLabelText('確認して追加')).toBeNull()
    expect(screen.getByRole('button', { name: '重複を確認' })).toBeTruthy()
    expect(previewQuery).toHaveBeenCalledTimes(1)
  })
  it('取消失敗時は履歴Modalとエラーを保持する', async () => {
    queryState.batches = [{ _id: 'batch-1', fileName: 'sample.pdf', createdAt: 0, count: 1, status: 'active', cancellable: true }]
    queryState.details = [{ ...row }]
    mutation.mockRejectedValue(new Error('編集済みのため取り消せません'))
    render(<PdfImportDrawer opened onClose={() => undefined} anchorDate="2026-06-01" />)
    await userEvent.click(screen.getByRole('tab', { name: '取込履歴' }))
    await userEvent.click(screen.getByRole('button', { name: '明細' }))
    await screen.findByText(/1回 2028-01-01/)
    await userEvent.click(screen.getByRole('button', { name: 'この取込を取り消す' }))
    await userEvent.click(screen.getByRole('button', { name: '取り消す' }))
    expect(await screen.findByText('編集済みのため取り消せません')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '取込明細' })).toBeTruthy()
  })
})
