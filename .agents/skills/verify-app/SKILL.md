---
name: verify-app
description: app-factory のアプリが本当に動くことを証明する手順。ビルドゲート、npx convex run による関数テスト、本番 URL への curl、vp dev のスクショ、本番 URL を全リクエストリレーでブラウザ表示して撮影、の順で検証する。Workers 本番でしか出ない不具合（error code 1042 など）の見つけ方も扱う。apps/ の変更を完了とする前、「動作確認して」「本番で見て」「スクショ撮って」のときに使う。
---

# app-factory の動作検証

検証コストの大半は環境起因のブラウザ通信問題に消える。だから既定は下の順番で、
クリック操作の E2E は既定では行わない。

## 検証の順番

1. **ビルドゲート。** `cd apps/<name> && vp run build`（vite build と tsc）
2. **バックエンド関数の直接テスト。** Convex を使うなら必須。
   `npx convex run <関数> '<JSON引数>'` で正常系、境界（営業時間の端、定休日など）、
   エラー系（検証エラー、競合）を数件ずつ叩く。数十秒で終わり、ブラウザ E2E より網羅的
3. **本番の SSR 確認。** 本番 URL に `curl` して全ルートの HTTP ステータスと主要文言を見る。
   デプロイ直後は一時的に 404 になることがあるので、数十秒おいて再試行してから調べる
4. **見た目のスクショ。** `vp dev` を起動し、プロキシ設定なしのヘッドレス Chromium で
   `http://localhost:<port>` を撮って目で見る。SSR 済みなので外部通信の細工は要らない
5. **本番 URL をブラウザで開く。** マウント後に動く処理（サーバー関数、クライアント fetch）が
   あるなら必須。[references/browser.md](references/browser.md) の「全リクエストリレー」で撮影する。
   手順3の `curl` は SSR の HTML しか見ない。ローカルの `vp dev` は実ネットワークに出られるので、
   本番だけで壊れる不具合を素通りさせる
6. **クリックからフォーム送信までの E2E。** ユーザーが求めたとき、またはクライアント側にしかない
   ロジックが重要なときだけ。[references/browser.md](references/browser.md) の後半（WebSocket リレー）

## 本番だけで壊れるもの

- Worker から同じゾーンの別の `*.workers.dev` への `fetch()` は `HTTP 404` とボディ
  `error code: 1042` で失敗する。ローカルでは成功する。手順5で初めて見つかる。
  直し方は Service Bindings（`apps/lab/src/server/liveness.ts` が実装例）
- 未デプロイの Worker は 404 ページがそのまま撮れてしまう。撮影前にデプロイ済みか確かめる

## ブラウザとプロキシ（Claude Code on the web のサンドボックス）

- egress がヘッドレス Chromium の外部 TLS を遮断する。直接でもプロキシ経由 CONNECT でも接続
  リセットになる（example.com でも）。外部通信はすべて Node 側の `fetch` にリレーする
- Chromium にプロキシを直接設定しない。localhost の読み込みまでプロキシに行って 405 になり、
  bypass 設定も効かない
- Node スクリプトは `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node script.mjs` で動かす
- 405 / 403 / 407 や TLS エラーが出たら、再試行の前に
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` と `/root/.ccr/README.md` を見る

他の環境（Cursor Cloud Agent、ローカル）では、まず Playwright の場所と外部 TLS が通るかを
1回試してから、リレーが要るかを決める。

## 後片付け

- `vp dev` などを裏で起動したら PID を控え、`kill $PID` で止める
- `pkill -f` と `pgrep -f ... | xargs kill` は使わない。自分のシェルに一致して自滅する。
  ポートから `lsof -i :<port>` で PID を引く
- プロセスの kill とデプロイを1つのコマンドに連結しない
- E2E で作ったデータは本番 DB に残る。デモとして許すか、管理用 mutation で消す

## 証拠

返答には、実際に走らせた手順の番号と結果（ステータス、見えた文言、撮ったスクショのパス）を書く。
走らせていない手順は「未実施」とその理由を書く。
