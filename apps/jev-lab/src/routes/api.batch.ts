import { createFileRoute } from '@tanstack/react-router'
import { evaluateBatch } from '../server/batch'
export const Route = createFileRoute('/api/batch')({ server: { handlers: { POST: async ({ request }) => { const { env } = await import('cloudflare:workers'); return evaluateBatch(request, env) } } } })
