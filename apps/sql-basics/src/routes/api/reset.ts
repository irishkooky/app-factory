import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/reset')({
  server: {
    handlers: {
      POST: async ({ request }) => (await import('../../server/views')).resetDb(request),
    },
  },
})
