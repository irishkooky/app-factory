import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { env } = await import('cloudflare:workers')

        const secret = request.headers.get('x-ai-secret')
        if (!secret || secret !== env.AI_ROUTE_SECRET) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        let body: { system?: string; prompt?: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'bad request' }, { status: 400 })
        }
        if (!body.prompt) {
          return Response.json({ error: 'bad request' }, { status: 400 })
        }

        try {
          const result = (await env.AI.run(
            '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            {
              messages: [
                ...(body.system
                  ? [{ role: 'system' as const, content: body.system }]
                  : []),
                { role: 'user' as const, content: body.prompt },
              ],
              max_tokens: 128,
            },
          )) as { response?: string }

          const text = (result.response ?? '').trim()
          if (!text) {
            return Response.json({ error: 'empty' }, { status: 502 })
          }
          return Response.json({ text })
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : 'ai error' },
            { status: 502 },
          )
        }
      },
    },
  },
})
