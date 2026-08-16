# lab

`apps/` 配下の全アプリを一覧するポータル。URL: https://lab.ichigoooo.workers.dev

## 新しいアプリを追加したときにやること

1. `apps/lab/src/data/meta.ts` に表示名・説明・カテゴリ・タグを追記する
   （書かなくても一覧には出るが、slug がそのまま表示され説明が既定文になる）
2. `vp run release` を実行する（`sync.mjs` → スクショ撮影 → 型生成 → build → deploy）
3. 生成物（`wrangler.jsonc` / `src/data/registry.gen.ts` / `public/shots/*.jpg` /
   `worker-configuration.d.ts`）をコミットする

自動生成ファイル（`wrangler.jsonc` / `src/data/registry.gen.ts` / `worker-configuration.d.ts`）は
手で編集しないこと。次回の `sync.mjs` / `cf-typegen` 実行で上書きされる。

## スクリプト

- `scripts/sync.mjs`: `apps/` を走査し、Cloudflare Workers API のデプロイ状況と突き合わせて
  `wrangler.jsonc` と `src/data/registry.gen.ts` を再生成する
- `scripts/shots.mjs`: デプロイ済みアプリのスクリーンショットを撮って
  `public/shots/<slug>.jpg` に保存する（`node scripts/shots.mjs --help` 相当は無いが、
  ファイル冒頭のコメントに使い方を書いてある）
- `scripts/lib.mjs`: 上記2つが共有する処理（apps/ の走査、Cloudflare API 呼び出し、
  JSONC パース等）

## 稼働チェックが Service Binding 経由である理由

一覧の各カードの稼働チェックは、Worker から他アプリの URL へ直接 `fetch` するのではなく
Service Binding（`wrangler.jsonc` の `services`）経由で行っている。
Cloudflare Workers 間で `https://<other>.workers.dev` へ直接 `fetch` すると
`error code: 1042`（Workers 間のリクエストは同一ゾーン外に出られない）になるため。
