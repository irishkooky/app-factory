// urls.py にあたる: URL と HTTP メソッドを views の関数に結びつける
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/tasks/')({
  server: {
    handlers: {
      GET: async ({ request }) => (await import('../../../server/views')).taskList(request),
      POST: async ({ request }) => (await import('../../../server/views')).taskCreate(request),
    },
  },
})
