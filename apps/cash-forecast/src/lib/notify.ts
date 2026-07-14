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

// ConvexError の場合は .data（このアプリでは日本語メッセージ）を優先して表示する。
// 本番デプロイメントは通常の Error のメッセージをクライアントに渡さず "Server Error" に
// 置き換えるため、意味のあるメッセージを見せたい箇所はサーバー側で ConvexError を使う想定。
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data: unknown = err.data
    if (typeof data === 'string' && data.length > 0) return data
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  if (err instanceof Error && err.message.length > 0) return err.message
  return fallback
}

export function notifyError(err: unknown, fallback: string) {
  notifyQueue.add({
    title: 'エラー',
    description: extractErrorMessage(err, fallback),
    variant: 'danger',
  })
}
