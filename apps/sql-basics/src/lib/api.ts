// 画面から API を呼ぶ小さなラッパー。送ったもの・返ってきたものをまるごと記録する
import type { ApiBody, RequestRecord } from './types'

let seq = 0

export async function callApi<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  role: RequestRecord['role'] = 'main',
): Promise<RequestRecord & { response: ApiBody<T> }> {
  const id = `r${++seq}`
  let status = 0
  let response: ApiBody<T>
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    status = res.status
    response = (await res.json().catch(() => ({ error: `HTTP ${res.status}（JSON ではない応答）` }))) as ApiBody<T>
  } catch (e) {
    response = { error: `通信に失敗しました: ${e instanceof Error ? e.message : String(e)}` }
  }
  return { id, method, url, body, status, response, role }
}

export function mainRequest(requests: RequestRecord[]): RequestRecord | undefined {
  return requests.find((r) => r.role === 'main') ?? requests[0]
}
