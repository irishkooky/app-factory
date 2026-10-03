// Worker の入口。TanStack Start の処理の前に「あなた専用 DB」の cookie を用意する
import handler from '@tanstack/react-start/server-entry'
import { SID_COOKIE, readSid, sidCookie } from './server/session'

export { SqlSandbox } from './server/sandbox'

export default {
  async fetch(request: Request): Promise<Response> {
    const cookie = request.headers.get('cookie')
    if (readSid(cookie)) return handler.fetch(request)

    // 初めての訪問: ID を発行し、この 1 回のリクエストにも付けてから処理する
    const sid = crypto.randomUUID()
    const headers = new Headers(request.headers)
    headers.set('cookie', [cookie, `${SID_COOKIE}=${sid}`].filter(Boolean).join('; '))
    const res = await handler.fetch(new Request(request, { headers }))
    const out = new Response(res.body, res)
    out.headers.append('set-cookie', sidCookie(sid))
    return out
  },
}
