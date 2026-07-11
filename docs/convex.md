# Convex を使うアプリの作り方

データベースが必要なアプリは Convex（https://convex.dev）を使う。
1アプリ = 1 Convexプロジェクト（prodデプロイメント1つ）。

## 前提（設定済み）

- `CONVEX_TEAM_ACCESS_TOKEN` が環境変数として供給されている
  （Convexダッシュボードで発行したTeam Access Token。リポジトリにはコミットしない）
- チームIDは不要。スクリプトが `/token_details` から自動解決する

## 手順

### 1. プロビジョニング

通常の新規アプリ手順（AGENTS.md セクション4）で `apps/<name>` を作った後:

```bash
scripts/convex-provision.sh <name>
```

これで Convexプロジェクト作成・デプロイキー発行が完了し、
`apps/<name>/.env.local` に `CONVEX_DEPLOY_KEY` と `VITE_CONVEX_URL` が書き込まれる（gitignore済み）。

### 2. 依存追加（apps/<name> 内で）

```bash
vp add convex @convex-dev/react-query @tanstack/react-query @tanstack/react-router-ssr-query
```

### 3. スキーマ・関数の実装

`apps/<name>/convex/` 配下に置く。例:

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    done: v.boolean(),
  }),
});
```

```ts
// convex/todos.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("todos").collect(),
});

export const add = mutation({
  args: { text: v.string() },
  handler: (ctx, { text }) => ctx.db.insert("todos", { text, done: false }),
});
```

`convex/_generated/` は `npx convex codegen` または deploy 時に自動生成される。手で編集しない。

### 4. ルーターへの組み込み

`src/router.tsx` の `getRouter()` を以下の形に変更する
（公式クイックスタート https://docs.convex.dev/quickstart/tanstack-start 準拠）:

```tsx
import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL!;
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <ConvexProvider client={convexQueryClient.convexClient}>
        {children}
      </ConvexProvider>
    ),
  });
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}
```

コンポーネント側は React Query 経由で使う:

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

const { data: todos } = useSuspenseQuery(convexQuery(api.todos.list, {}));
```

### 5. デプロイ（apps/<name> 内で）

```bash
npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL
wrangler deploy
```

`npx convex deploy` は `.env.local` の `CONVEX_DEPLOY_KEY` で非対話認証され、
Convex関数のプッシュとフロントエンドビルド（`VITE_CONVEX_URL` の注入込み）を1コマンドで行う。
その後 `wrangler deploy` で Workers に配置し、URLを報告する。

## Convex側の環境変数

Convexの関数から使うシークレット等は Workers ではなく Convex デプロイメントに設定する:

```bash
npx convex env set SOME_SECRET value   # CONVEX_DEPLOY_KEY で認証される
```

## 注意事項

- `VITE_CONVEX_URL` は**ビルド時**に `import.meta.env` で解決される。
  Workers ランタイムの `process.env` 制約とは無関係（トップレベル読み取り禁止ルールに抵触しない）
- Management API はベータ。プロビジョニングが失敗したらエラーレスポンスを確認し、
  ダッシュボード（https://dashboard.convex.dev）で状態を確認する
- 無料（Starter）プランはチームあたり**40デプロイメント**まで。
  1アプリ=1 prodデプロイメントなので、上限に近づいたら不要プロジェクトを削除するかProプランを検討
- ローカル開発は `npx convex dev`（非対話シェルでは匿名ローカルデプロイメントが自動作成される）
- デプロイキー（`.env.local`）は絶対にコミットしない
