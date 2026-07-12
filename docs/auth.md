# 認証（Googleログイン）が必要なアプリの作り方

認証が必要なアプリは **Clerk（共有開発インスタンス）+ Convex** を使う。
Clerkアプリケーションは全appsで1つを共有する（＝ユーザープールも全アプリ共通。
アプリAでログインしたユーザーはアプリBでも同一ユーザーになる）。

参照実装: `apps/auth-demo`（Googleログイン + ユーザー別メモCRUD）

## 前提（設定済み）

- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` が環境変数として供給されている
  （ローカルではリポジトリ直下の `.env`。スクリプトが自動で読む）
- Clerkダッシュボードで Google ログインが有効化済み、JWTテンプレート `convex` 作成済み
- 認証アプリはConvex前提。`docs/convex.md` も併せて参照

## 手順

### 1. プロビジョニング

`apps/hello` から `apps/<name>` を作成した後:

```bash
scripts/convex-provision.sh <name>   # Convexプロジェクト作成（docs/convex.md 参照）
scripts/clerk-provision.sh <name>    # Clerk認証対応（このスクリプトがやることは下記）
```

`clerk-provision.sh` は以下を自動で行う（冪等。再実行しても安全）:

1. Cloudflareのworkers.devサブドメインからアプリ本番URLを導出
2. Clerkインスタンスの `allowed_origins` にそのURLと `http://localhost:5173` を追加
3. `apps/<name>/.env.local` に `VITE_CLERK_PUBLISHABLE_KEY` を書き込み
4. publishable keyからissuer domainを導出し、Convexデプロイメントに
   `CLERK_JWT_ISSUER_DOMAIN` を設定

### 2. 依存追加（apps/<name> 内で）

```bash
vp add convex @clerk/clerk-react
```

（認証アプリはreact-query統合を使わないシンプル構成。`useQuery`/`useMutation` は `convex/react` から使う）

### 3. Convex側の実装

**convex/auth.config.ts**（そのままコピーでよい）:

```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

※ このファイルはConvexサーバー側で実行されるため `process.env` を使ってよい
（Workersの「トップレベルで読まない」制約はアプリ側コードの話）。

**関数でのユーザー識別**: `ctx.auth.getUserIdentity()` を使う。
`identity.subject` がClerkのユーザーIDで、これをデータの `userId` フィールドに使う。

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("ログインが必要です"); // queryなら空配列返却でもよい
// identity.subject がユーザーID、identity.name / identity.email 等も取れる
```

- ユーザー別データのテーブルには `.index("by_user", ["userId"])` を張る
- mutationでは必ず所有権チェック（対象レコードの `userId !== identity.subject` なら拒否）

### 4. フロント側の配線

**src/router.tsx** — `Wrap` で二重に包む:

```tsx
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'

// getRouter() 内で
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
// ...
Wrap: ({ children }) => (
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  </ClerkProvider>
),
```

**UI側** — `convex/react` の3コンポーネントで分岐:

```tsx
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/clerk-react'

<Unauthenticated>
  <SignInButton mode="modal">{/* MantineのButtonでラップ */}</SignInButton>
</Unauthenticated>
<AuthLoading>{/* Loader */}</AuthLoading>
<Authenticated>
  <UserButton />
  {/* useQuery(api.xxx.list) 等。認証済みトークンは自動で付与される */}
</Authenticated>
```

SSRは未認証状態でレンダリングされ、クライアントでClerkがロードされてから
認証状態が確定する（`AuthLoading` がその間表示される）。

### 5. デプロイ（apps/<name> 内で）

```bash
npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL
wrangler deploy
```

## 注意事項

- **Clerk開発インスタンスの制約**: ユーザー上限100人、ログインUIに「development mode」表示、
  GoogleのOAuth認証情報はClerkの共有クレデンシャル。個人用・実験用アプリには十分だが、
  外部公開する本気のアプリには不足。本番昇格はそのアプリだけ手動作業
  （Clerk本番インスタンス＋カスタムドメイン＋自前Google OAuthクライアント）が必要で、
  `workers.dev` ドメインのままでは本番化できない
- `clerk-provision.sh` は `convex-provision.sh` の後に実行する
  （Convexデプロイメントへのissuer設定があるため。順序を間違えたら再実行すればよい）
- `allowed_origins` はインスタンス全体の設定。スクリプトは既存リストにマージ追記するので
  他アプリのエントリを消すことはない
- 認証まわりの環境変数はすべて `.env.local`（gitignore済み）とConvex側にあり、
  Workersにシークレットを置く必要はない（Clerkのsecret keyはプロビジョニング時のみ使用）
