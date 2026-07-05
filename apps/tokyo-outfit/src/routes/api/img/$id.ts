import { createFileRoute } from '@tanstack/react-router'

const IMG_PREFIX = 'img:'

export const Route = createFileRoute('/api/img/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { env } = await import('cloudflare:workers')

        const bytes = await env.CLOSET_KV.get(IMG_PREFIX + params.id, 'arrayBuffer')
        if (!bytes) {
          return new Response('Not Found', { status: 404 })
        }

        return new Response(bytes, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
