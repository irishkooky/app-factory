/** Fisher-Yates。呼び出し側（イベントハンドラ内）でのみ使うこと */
export function shuffled<T>(items: readonly T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/**
 * 引き切ったら自動で補充されるバッグ。
 * draw() は [引いた要素, 次のバッグ] を返す純粋関数にする。
 * 元配列が空の場合は undefined を返し、呼び出し側で防御すること。
 */
export function draw<T>(bag: readonly T[], source: readonly T[]): { item: T | undefined; rest: T[] } {
  if (source.length === 0) {
    return { item: undefined, rest: [] }
  }
  const workingBag = bag.length === 0 ? shuffled(source) : [...bag]
  const [item, ...rest] = workingBag
  return { item, rest }
}
