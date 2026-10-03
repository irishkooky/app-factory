import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: async ({ request }) => (await import('../../server/views')).categoryList(request),
    },
  },
})
