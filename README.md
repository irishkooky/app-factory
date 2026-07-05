# app-factory

小さなWebアプリを量産するためのモノレポです。`apps/` 配下の1フォルダが1アプリとなり、
それぞれ独立したCloudflare Workerとしてデプロイされます。

- フレームワーク: TanStack Start（React 19）+ Mantine v9
- コマンド体系: Vite+（`vp`）
- デプロイ先: Cloudflare Workers

## 使い方

詳細な運用ルール・新規アプリの作り方は [AGENTS.md](./AGENTS.md) を参照してください
（`CLAUDE.md` は `AGENTS.md` へのシンボリックリンクです）。

```bash
# 依存関係インストール（ワークスペース全体）
vp install

# 雛形アプリをコピーして新規アプリを作成
cp -r apps/hello apps/my-new-app
cd apps/my-new-app
vp install

# ビルド確認
vp run build

# デプロイ
wrangler deploy
```
