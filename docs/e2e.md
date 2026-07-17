# ブラウザ操作E2E（必要な場合のみ）

**既定の検証フローでは不要**（AGENTS.md 10章「動作検証の標準フロー」参照）。
「クリック〜フォーム送信までを実ブラウザで通す」検証が本当に必要な場合だけ、この手順を使う。

## 前提知識: なぜ普通にはできないか

- このサンドボックスの egress は **ヘッドレスChromiumの外部TLSをフィンガープリントで遮断**する。
  直接アクセスもプロキシ経由CONNECTも `ERR_CONNECTION_RESET` になる（example.com ですら失敗）
- したがって本番URL（workers.dev）をブラウザで開くことは不可能。
  ページは **ローカル開発サーバー（`vp dev`）** から読み込む
- ページ内から外部（Convex等）への通信は、すべて **Node側にリレー** する。
  Node の fetch/TLS はプロキシ経由で外に出られる

## 構成（Convexアプリの場合）

```
Chromium ──HTTP──> localhost:5199 (vp dev)
Chromium ──WSS──> (/etc/hosts で <deployment>.convex.cloud → 127.0.0.1)
                  └─> 127.0.0.1:443 の自作TCPトンネル ──CONNECT──> agent proxy ──> Convex
```

TLSはトンネル先のプロキシが再署名するため、ChromiumがそのCAを信頼する必要がある（下記手順2）。

## 手順

### 1. /etc/hosts にConvexデプロイメントをマッピング

```bash
echo "127.0.0.1 <deployment>.convex.cloud" >> /etc/hosts
# IPv6のAAAAがDNSに抜けるので ::1 も必ず追加（コンテナにIPv6がなくてもフォールバックで効く）
echo "::1 <deployment>.convex.cloud" >> /etc/hosts
```

### 2. ChromiumのNSSストアにプロキシCAを登録

```bash
apt-get update && apt-get install -y libnss3-tools
mkdir -p /root/.pki/nssdb
certutil -d sql:/root/.pki/nssdb -N --empty-password
certutil -d sql:/root/.pki/nssdb -A -t "C,," -n agentproxy-ca -i /root/.ccr/ca-bundle.crt
```

### 3. TCPトンネル（127.0.0.1:443 → agent proxy → Convex）

`tunnel.mjs`（作業用ディレクトリに置く。**IPv4のみでlistenする**。`::1` はbindできない）:

```js
import net from 'node:net'
const PROXY_PORT = Number(new URL(process.env.HTTPS_PROXY).port)
const TARGET = '<deployment>.convex.cloud:443'
const handler = (client) => {
  const up = net.connect(PROXY_PORT, '127.0.0.1', () => {
    up.write(`CONNECT ${TARGET} HTTP/1.1\r\nHost: ${TARGET}\r\n\r\n`)
  })
  let established = false, buf = Buffer.alloc(0)
  up.on('data', (d) => {
    if (established) return client.write(d)  // 確立後は片方向のみ手動転送（pipeと二重転送しない）
    buf = Buffer.concat([buf, d])
    const idx = buf.indexOf('\r\n\r\n')
    if (idx === -1) return
    if (!/ 200 /.test(buf.slice(0, idx).toString())) { client.destroy(); up.destroy(); return }
    established = true
    const rest = buf.slice(idx + 4)
    if (rest.length) client.write(rest)
    client.pipe(up)
  })
  const kill = () => { client.destroy(); up.destroy() }
  up.on('error', kill); client.on('error', kill)
}
net.createServer(handler).listen(443, '127.0.0.1', () => console.log('tunnel ready'))
```

疎通確認:

```bash
curl -sS --noproxy '*' --cacert /root/.ccr/ca-bundle.crt \
  -o /dev/null -w "%{http_code}\n" https://<deployment>.convex.cloud/
# → 200 ならOK
```

### 4. Playwrightスクリプト側のリレー設定

グローバルの `playwright` を使う（`import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'`）。
Chromiumは**プロキシ設定なし・特別なフラグなし**で起動する。

```js
// Convex への WebSocket を Node 側 WebSocket にリレー
// （Node側は /etc/hosts + トンネル経由で外に出る）
await page.routeWebSocket(/convex\.cloud/, (route) => {
  const target = new WebSocket(route.url())
  const pending = []
  let open = false
  target.addEventListener('open', () => { open = true; for (const m of pending) target.send(m) })
  target.addEventListener('message', (ev) => route.send(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data)))
  target.addEventListener('close', (ev) => { try { route.close({ code: ev.code >= 1000 && ev.code < 5000 ? ev.code : 1000 }) } catch {} })
  target.addEventListener('error', () => { try { route.close({ code: 1011 }) } catch {} })
  route.onMessage((m) => { if (open) target.send(m); else pending.push(m) })
  route.onClose(() => { try { target.close() } catch {} })
})
// HTTP(S) fetch のリレー
await page.route('https://<deployment>.convex.cloud/**', async (route) => {
  const req = route.request()
  try {
    const res = await fetch(req.url(), { method: req.method(), headers: req.headers(), body: req.postDataBuffer() ?? undefined })
    const body = Buffer.from(await res.arrayBuffer())
    const headers = {}
    res.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(k)) headers[k] = v })
    await route.fulfill({ status: res.status, headers, body })
  } catch { await route.abort() }
})
```

## ハマりどころ（実際に踏んだもの）

- **ハイドレーション前のクリックは無反応**になる。最初の操作は「クリック→期待要素の出現確認→
  出なければ1秒待って再クリック」のリトライにする
- テスト終了時にWSリレーのハンドルが残りプロセスが終了しないことがある。`finally` で
  `process.exit()` する
- Chromium は `--host-resolver-rules` も無視することがある。ホスト名の差し替えは /etc/hosts で行う
- `NODE_EXTRA_CA_CERTS` は環境変数として設定済みなので、Node側のTLS信頼は追加設定不要
- E2Eで作成したデータは本番DBに残る。デモとして許容するか、管理系mutationで掃除する
