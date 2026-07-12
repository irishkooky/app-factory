import { notifications } from '@mantine/notifications'

export function notifySaved(message = '保存しました') {
  notifications.show({ message, color: 'teal' })
}

export function notifyDeleted(message = '削除しました') {
  notifications.show({ message, color: 'teal' })
}

export function notifyError(err: unknown, fallback: string) {
  notifications.show({
    title: 'エラー',
    message: err instanceof Error ? err.message : fallback,
    color: 'red',
  })
}
