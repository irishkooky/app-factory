import { createFileRoute } from '@tanstack/react-router'
import { evaluateSemantic } from '../server/semantic'

export const Route = createFileRoute('/api/semantic')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { env } = await import('cloudflare:workers')
        return evaluateSemantic(request, env)
      },
    },
  },
})
