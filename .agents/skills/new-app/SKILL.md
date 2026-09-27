---
name: new-app
description: app-factory に新しいアプリを1つ追加する手順。apps/hello を雛形としてコピーし、Worker 名を揃え、DB・認証・課金が要るかで追加スキルを選び、実装して ship-app に渡すまでを扱う。「〜なアプリを作って」「新しいアプリを追加」のように apps/ 配下に新規フォルダが生まれる依頼で使う。
---

# 新規アプリの追加

1アプリ = `apps/<kebab-case名>` の1フォルダ = 1つの Cloudflare Worker = 1つの URL。
他のアプリに依存させない。

## 1. 雛形をコピーする

```bash
cp -r apps/hello apps/<name>
```

`apps/<name>/package.json` の `name` と `apps/<name>/wrangler.jsonc` の `name` を `<name>` に変える。
Worker 名はそのまま URL（`https://<name>.ichigoooo.workers.dev`）になるので、既存アプリと重ならないか
`ls apps/` で確かめる。

```bash
cd apps/<name> && vp install
```

## 2. 追加の基盤を選ぶ

| 必要なもの | 使うスキル | 前提 |
|---|---|---|
| データの保存 | `convex-app` | なし |
| Googleログイン | `clerk-auth` | `convex-app` |
| サブスク課金 | `stripe-billing` | `convex-app` と `clerk-auth` |

どれも要らないなら SSR だけの Worker でよい。基盤は必要になってから足す。

## 3. 実装する

- ルートは `src/routes/` 配下に足す。`src/routeTree.gen.ts` は自動生成なので触らない
- テーマは雛形の `src/theme.ts` をそのまま使う。UI は Mantine v9 のみ
- ライブラリの API を書く前に Context7 MCP で最新ドキュメントを確認する
- 他の Worker を呼ぶなら Service Bindings を使う（`AGENTS.md` の不変条件を参照）

## 4. ポータルの表示情報を書く

`apps/lab/src/data/meta.ts` の `META` に `<name>` のエントリを足す。
`title`、`description`、`category`（`tool` / `game` / `demo`）、`tags` を埋める。
書かなくても一覧には出るが、slug がそのまま表示されて説明が既定文になる。
`No.` と並び順は Worker の作成日から自動で決まるので書かない。

## 5. 出荷する

`verify-app` で動作を確かめ、`ship-app` でデプロイからマージまで進める。
新規アプリなので `ship-app` の「ポータル更新」は `vp run release` のほうを使う。
