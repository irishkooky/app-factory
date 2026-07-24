import { ConvexError } from 'convex/values'

/**
 * Convex の本番デプロイメントは通常の Error のメッセージをクライアントに渡さず
 * 「Server Error」に隠蔽する。ユーザー向けメッセージを見せたい場合はサーバー側で
 * ConvexError を throw し、クライアント側ではこのヘルパーで data を取り出す。
 */
export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === 'string') {
    return e.data
  }
  return 'エラーが発生しました。もう一度お試しください。'
}
