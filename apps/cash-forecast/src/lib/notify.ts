import { ToastQueue } from '@heroui/react'
import { ConvexError } from 'convex/values'

// wrapUpdate をデフォルトの View Transitions ベースから同期実行に差し替える。
// バックグラウンドタブ（document.visibilityState !== 'visible'）では
// document.startViewTransition() のコールバックが実質停止し、トーストの
// 再描画がいつまでも走らないことがあるため、単純なトースト表示には不要な
// View Transition 依存を外し、確実に同期更新させる。
export const notifyQueue = new ToastQueue({ wrapUpdate: (fn) => fn() })

export function notifySaved(message = '保存しました') {
  notifyQueue.add({ title: message, variant: 'success' })
}

export function notifyDeleted(message = '削除しました') {
  notifyQueue.add({ title: message, variant: 'success' })
}

// ConvexError の場合は .data（このアプリでは常に日本語メッセージの文字列）を優先して表示する。
// 本番デプロイメントは通常の Error のメッセージをクライアントに渡さず "Server Error" に
// 置き換えるため、意味のあるメッセージを見せたい箇所はサーバー側で ConvexError を使う想定。
// 通常の Error（バリデーションエラー等、開発環境やメッセージがそのまま届くケース）は
// 従来どおり message を表示し、それ以外は fallback にフォールバックする。
export function notifyError(err: unknown, fallback: string) {
  let description = fallback
  if (err instanceof ConvexError && typeof err.data === 'string' && err.data.length > 0) {
    description = err.data
  } else if (err instanceof Error && err.message.length > 0) {
    description = err.message
  }
  notifyQueue.add({
    title: 'エラー',
    description,
    variant: 'danger',
  })
}
