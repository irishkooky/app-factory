import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/tasks/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        (await import('../../../server/views')).taskUpdate(request, params.id),
      DELETE: async ({ request, params }) =>
        (await import('../../../server/views')).taskDelete(request, params.id),
    },
  },
})
