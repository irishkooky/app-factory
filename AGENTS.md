# app-factory

## 1. このリポジトリについて

このリポジトリは「app factory」です。小さなWebアプリを大量生産するためのモノレポで、
Claude Code on the web（クラウドサンドボックス）から使われることを前提としています。

- `apps/` 配下の1フォルダ = 1アプリ = 1つのCloudflare Worker = 1つのURL（`<name>.workers.dev`）
- 各アプリは独立してビルド・デプロイされます（他アプリに依存しません）
- `apps/hello` は新規アプリ作成時にコピーする雛形（テンプレート）です

## 2. 技術スタック（固定・変更禁止）

- **フレームワーク**: TanStack Start（React 19）
- **UI**: 必ずMantine v9を使用する。テーマは雛形の `src/theme.ts` を流用すること
- **コマンド体系**: Vite+（`vp`）をコマンド体系として使用する
- **デプロイ先**: Cloudflare Workers
- **パッケージマネージャ**: pnpm。ただし直接叩かず、必ず `vp` 経由で操作する
  - `npm` / `pnpm` の直接実行は禁止

これらは固定の技術選定です。理由なく変更・置換しないこと。

## 3. コマンド規約

| 目的 | コマンド |
|---|---|
| 依存関係インストール | `vp install` |
| 開発サーバー起動 | `vp dev` |
| ビルド | `vp build` |
| テスト | `vp test` |
| 静的チェック | `vp check` |
| 依存追加 | `vp add <pkg>`（開発依存は `vp add -D <pkg>`） |
| ビルド検証 | 各アプリのディレクトリ内で `vp run build` を実行する |

## 4. 新規アプリの作り方（手順）

1. `apps/hello` を `apps/<kebab-case名>` にコピーする
2. `package.json` の `name` と `wrangler.jsonc` の `name` をフォルダ名に変更する
3. `vp install` を実行する
4. 実装する（ルートは `src/routes/` 配下に追加していく）
5. `vp run build` が通ることを確認する
6. `wrangler deploy` でデプロイする
   （`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` は環境変数として供給済み）
7. `git commit` して `push` する
8. **最後に必ずデプロイURL（`https://<name>.<account>.workers.dev`）を報告して終了する**

## 5. 既存アプリの修正

1. `apps/<name>` で作業する
2. `vp run build`
3. `wrangler deploy`
4. `commit` & `push`
5. URLを報告する

## 6. データベースが必要な場合（Convex）

- DBが必要なアプリは Convex を使う。詳細手順は `docs/convex.md` を参照
- `CONVEX_TEAM_ACCESS_TOKEN` は環境変数として供給済み。`scripts/convex-provision.sh <app-name>` を実行すると、プロジェクト作成〜デプロイキー発行〜`.env.local` への書き込みまで完結する（チームIDの指定は不要）
- デプロイは `npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL` → `wrangler deploy`

## 7. 注意事項

- `wrangler login` は絶対に使わない（ヘッドレス環境のため認証できない）
- `process.env` をモジュールトップレベルで読まない（Workers環境の制約。`cloudflare:workers` の `env` を使うこと）
- `src/routeTree.gen.ts` は自動生成ファイルなので手で編集しない
- ビルドが通らない状態でデプロイ・コミットしない
- bindingsを変更した場合は `wrangler types`（`cf-typegen`）でEnv型を再生成する
