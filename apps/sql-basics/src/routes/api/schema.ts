import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/schema')({
  server: {
    handlers: {
      GET: async ({ request }) => (await import('../../server/views')).schema(request),
    },
  },
})
