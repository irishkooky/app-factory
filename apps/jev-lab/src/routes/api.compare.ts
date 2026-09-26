import { createFileRoute } from '@tanstack/react-router'
import { evaluateComparison } from '../server/comparison'

export const Route = createFileRoute('/api/compare')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { env } = await import('cloudflare:workers')
        return evaluateComparison(request, env)
      },
    },
  },
})
