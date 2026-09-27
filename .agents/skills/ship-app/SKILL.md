---
name: ship-app
description: app-factory のアプリ（新規・既存どちらも）をビルド、Cloudflare Workers へデプロイ、作品一覧ポータル apps/lab を更新、コミットと PR、マージ、URL 報告まで運ぶ手順。apps/<name> の変更を本番に出すとき、「デプロイして」「出して」「反映して」のときに使う。
---

# アプリの出荷

このリポジトリではデプロイがマージより先に来る。マージは品質ゲートではなく、
main を本番の写しとして保つための作業。だから止まらずに最後まで運ぶ。

## 1. ビルドゲート

```bash
cd apps/<name> && vp run build
```

`vite build` と `tsc --noEmit` が両方通るまで先に進まない。
bindings を変えたなら先に `vp run cf-typegen`（`wrangler types`）で `worker-configuration.d.ts` を作り直す。

## 2. デプロイ

Convex を使わないアプリ:

```bash
cd apps/<name> && wrangler deploy
```

Convex を使うアプリは、Convex を先に出してから Worker を出す:

```bash
cd apps/<name> && npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL && wrangler deploy
```

`CLOUDFLARE_API_TOKEN` や `CONVEX_DEPLOY_KEY` が無い環境ではデプロイできない。
回避策を作らず、足りない環境変数の名前をユーザーに伝えて Secrets への追加を頼む。

## 3. 本番で確かめる

`verify-app` の「検証の順番」の3番以降を本番 URL に対して行う。

## 4. ポータル更新

どちらか一方を行う。

- 新規アプリ、または見た目が大きく変わった上に meta も変えたとき:
  `cd apps/lab && vp run release`。一覧の再生成、スクショ撮影、型生成、build、deploy を一括で行う
- 既存アプリの見た目が大きく変わっただけのとき:
  `cd apps/lab && vp run shots --only <name>`

生成物（`apps/lab/wrangler.jsonc`、`apps/lab/src/data/registry.gen.ts`、`apps/lab/public/shots/*.jpg`、
`apps/lab/worker-configuration.d.ts`）は手で編集せず、そのままコミットに含める。
見た目が変わらない修正ならこの手順は `skip: 見た目の変更なし`。

## 5. コミット、PR、マージ

PR とマージの扱いは `AGENTS.md` の「pstack の既定を上書きする規則」に従う。
apps/ 配下だけの変更なら squash merge まで行い、リモートブランチを消す。

## 6. 報告

最後の返答に次の2つを必ず入れる。

- デプロイ URL: `https://<name>.ichigoooo.workers.dev`
- マージ結果: マージ済みの PR リンク。共有部分に触れてマージしていないなら、その理由
