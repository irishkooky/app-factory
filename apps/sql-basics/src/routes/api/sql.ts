import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/sql')({
  server: {
    handlers: {
      POST: async ({ request }) => (await import('../../server/views')).runSql(request),
    },
  },
})
