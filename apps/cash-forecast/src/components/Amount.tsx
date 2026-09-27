import { formatYen, type Kind } from '../lib/money'

export function NetYen({ value }: { value: number }) {
  return (
    <>
      {value >= 0 ? '+' : ''}
      {formatYen(value)}
    </>
  )
}

export function KindYen({ kind, amount }: { kind: Kind; amount: number }) {
  return (
    <>
      {kind === 'expense' ? '-' : '+'}
      {formatYen(amount)}
    </>
  )
}

export function netTone(value: number): string {
  return value >= 0 ? 'text-blue-600' : 'text-red-600'
}

export function kindTone(kind: Kind): string {
  return kind === 'expense' ? 'text-red-600' : 'text-blue-600'
}
