import { ToastQueue } from '@heroui/react'

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

export function notifyError(err: unknown, fallback: string) {
  notifyQueue.add({
    title: 'エラー',
    description: err instanceof Error ? err.message : fallback,
    variant: 'danger',
  })
}
