import { createFileRoute } from '@tanstack/react-router'
import { evaluate } from '../server/evaluate'

export const Route = createFileRoute('/api/evaluate')({
  server: { handlers: { POST: async ({ request }) => {
    const { env } = await import('cloudflare:workers')
    return evaluate(request, env)
  } } },
})
