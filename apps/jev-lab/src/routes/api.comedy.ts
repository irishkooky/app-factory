import { createFileRoute } from '@tanstack/react-router'
import { evaluateComedy } from '../server/comedy'

export const Route = createFileRoute('/api/comedy')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { env } = await import('cloudflare:workers')
        return evaluateComedy(request, env)
      },
    },
  },
})
