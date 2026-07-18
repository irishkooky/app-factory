self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: '💊 ロキソニンリマインダー', body: '通知があります' }
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    // JSON パースに失敗した場合はデフォルト文言を使う
  }

  const title = data.title || '💊 ロキソニンリマインダー'
  const body = data.body || '通知があります'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'loxonin-reminder',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of clientsList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })(),
  )
})
