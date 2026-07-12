# 課金（Stripe サブスク Free/Pro）が必要なアプリの作り方

サブスク課金が必要なアプリは **Stripe（テストモード）+ Convex + Clerk** を使う。
「Free プランは機能制限つき、Pro プランは月額課金で無制限」という2プラン構成を前提とする。

参照実装: `apps/cash-forecast`（Free=ルール3件まで・グラフ/月次サマリー/アドオンなし、Pro=月額¥300で無制限）

## 前提（設定済み）

- `STRIPE_SECRET_KEY` が環境変数として供給されている
  （**テストモードの鍵**。ローカルではリポジトリ直下の `.env`。スクリプトが自動で読む）
- 課金アプリは **Convex + Clerk 前提**（プラン状態の保存とユーザー識別に使う）。
  `docs/convex.md` / `docs/auth.md` を先に実施すること
- すべて**テストモード**で実装・検証する。実課金の開始はそのアプリの本番化
  （独自ドメイン + Clerk 本番インスタンス。`docs/auth.md` の注意事項参照）が済んでから

## 仕組み（全体像）

- **Stripe の秘密は Convex デプロイメントにだけ置く**（Workers には置かない）。
  フロント → Convex action → Stripe API という経路で Checkout / Customer Portal の URL を作る
- プラン状態は Convex の `subscriptions` テーブルに保存し、Stripe からの webhook
  （Convex HTTP Actions の `https://<deployment>.convex.site/stripe/webhook`）で同期する
- **プラン判定の真実はサーバー（Convex）**。無料プランの制限は mutation / query 内で強制し、
  UI はその写しとして導線を出し分ける

## 手順

### 1. プロビジョニング

`docs/convex.md` と `docs/auth.md` の手順を済ませた後:

```bash
scripts/stripe-provision.sh <name> [monthly-price-jpy]   # 省略時 300円
```

このスクリプトは以下を自動で行う（冪等。再実行しても安全）:

1. `apps/<name>/.env.local` の `VITE_CONVEX_URL` から webhook URL
   （`https://<deployment>.convex.site/stripe/webhook`）を導出
2. Product「`<name>` Pro」と月額 JPY の Price を作成（既存なら再利用）
3. Customer Portal 設定を作成（アカウントに既存があれば再利用）
4. Webhook endpoint を作成（イベント: `checkout.session.completed` /
   `customer.subscription.updated` / `customer.subscription.deleted`）
5. Convex デプロイメントに `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
   `STRIPE_PRICE_ID` / `STRIPE_PORTAL_CONFIG_ID` / `APP_URL` を設定

### 2. 依存追加（apps/<name> 内で）

```bash
vp add stripe
```

### 3. ファイルのコピー（cash-forecast から）

以下はアプリ非依存に作られているので**そのままコピーする**:

| コピー元（apps/cash-forecast/） | 役割 |
|---|---|
| `convex/billing.ts` | Checkout / Portal セッション作成 action、`getPlan` query、`isPro` / `requirePro` ヘルパー、webhook からの upsert |
| `convex/http.ts` | Stripe webhook 受け口（署名検証・冪等・順序耐性） |
| `src/components/BillingControls.tsx` | `PlanBadge` / `UpgradeButton` / `ManageBillingButton` / `BillingButton` / `ProGate` / `usePlan` |

さらに `convex/schema.ts` に `subscriptions` テーブルを追記する（そのままコピー）:

```ts
subscriptions: defineTable({
  userId: v.string(),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  status: v.string(), // Stripe の subscription status（active / trialing / canceled など）
  currentPeriodEnd: v.number(), // エポックミリ秒
})
  .index("by_user", ["userId"])
  .index("by_customer", ["stripeCustomerId"]),
```

### 4. プラン制限の組み込み（アプリ固有）

制限したい mutation / query に `isPro` / `requirePro` を仕込む。
件数上限の定数はそのアプリの関数ファイル側に置く（`billing.ts` には入れない）。

```ts
// 例: 件数上限（apps/cash-forecast/convex/rules.ts の create より）
import { ConvexError } from "convex/values";
import { isPro } from "./billing";

export const FREE_RULE_LIMIT = 3;

// mutation の認証チェック後に:
if (!(await isPro(ctx, identity.subject))) {
  const existing = await ctx.db
    .query("rules")
    .withIndex("by_user", (q) => q.eq("userId", identity.subject))
    .collect();
  if (existing.length >= FREE_RULE_LIMIT) {
    throw new ConvexError(
      `Freeプランで作成できるルールは${FREE_RULE_LIMIT}件までです。Proプランなら無制限です`,
    );
  }
}
```

```ts
// 例: 機能まるごと Pro 限定（apps/cash-forecast/convex/transactions.ts の create より）
import { requirePro } from "./billing";

if (args.addon === true) {
  await requirePro(ctx, identity.subject);
}
```

設計ルール:

- **新規作成だけをブロックし、既存データは消さない・編集/削除は許す**
  （Pro を解約したユーザーのデータを人質にしない）
- 制限エラーは `ConvexError` で投げる（本番デプロイメントでは通常の `Error` の
  メッセージがクライアントに届かないため）

### 5. フロント組み込み（アプリ固有）

`BillingControls.tsx` の部品を配置する（配置例は `apps/cash-forecast/src/routes/index.tsx`）:

- ヘッダーに `<PlanBadge />`（Free/Pro バッジ）
- 操作ボタン列に `<BillingButton />`（Free なら「Proにアップグレード」→ Checkout、
  Pro なら「サブスク管理」→ Customer Portal）
- Pro 限定機能の表示は `<ProGate title="…" description="…">…</ProGate>` で包む
- 件数上限系は、上限到達時に追加フォームを disabled にして
  `<UpgradeButton size="xs" />` を添える（サーバー側の強制が本体。UI は案内）
- Checkout から戻る URL は `${APP_URL}/?billing=success` / `?billing=cancel`。
  success 時に「反映まで数秒かかる」旨の Alert を出す（webhook 反映は非同期。
  Convex の `getPlan` はリアクティブなので反映されれば UI は自動で切り替わる）

### 6. デプロイ（apps/<name> 内で）

```bash
npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL
wrangler deploy
```

### 7. 動作確認（テストモード）

1. アプリにGoogleログインし、「Proにアップグレード」から Stripe Checkout に遷移する
2. テストカード `4242 4242 4242 4242`（有効期限は未来の任意、CVC 任意）で決済する
3. アプリに戻り、数秒でバッジが Pro になり制限が解除されることを確認する
4. 「サブスク管理」から Customer Portal が開き、解約（期間終了時）できることを確認する
5. Stripe ダッシュボード（テストモード）の Webhook ログで `checkout.session.completed`
   が 200 を返していることを確認する

curl で webhook の署名検証だけ確かめる場合（不正署名は 400 になるはず）:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  "https://<deployment>.convex.site/stripe/webhook" \
  -H 'stripe-signature: t=0,v1=bad' -d '{}'   # => 400
```

## webhook の堅牢性設計（billing.ts / http.ts を触るときに壊さないこと）

- **署名検証必須**: `stripe.webhooks.constructEventAsync` + `Stripe.createSubtleCryptoProvider()`
  （Convex のデフォルトランタイムは V8 isolate なので `"use node"` は使わず、
  Stripe クライアントは `Stripe.createFetchHttpClient()` で作る）
- **冪等・順序耐性**: イベントのペイロードの値は信用せず、イベントから
  subscription ID だけ取り出して **Stripe API から現在の状態を取得**して upsert する。
  同一イベントの再送でも、順序が乱れて届いても、常に最新状態へ収束する
- ハンドラ内の予期しない失敗は 500 を返す（Stripe が自動再送してくれる）

## 注意事項

- `stripe-provision.sh` は**テストモードの鍵（`sk_test_` / `rk_test_`）以外を拒否する**。
  実課金を始める段階になったら、本番鍵での運用は別途設計すること
  （webhook・Price・Portal 設定は live モードに作り直しが必要）
- Product / Price / Webhook / Portal 設定は **Stripe アカウント全体で共有**。
  Product は `metadata[app]` でアプリ別に分離され、webhook はデプロイメント別 URL なので
  他アプリと衝突しない。Portal 設定だけは全アプリ共通の1つを使い回す
- 価格変更: Price は作成後に金額変更できない。新しい Price を作って
  `STRIPE_PRICE_ID` を差し替える（既存契約者は旧 Price のまま）
- グラフ表示のようなクライアント計算の機能はフロントの `ProGate` でしか隠せない
  （データ自体は Free ユーザーも正当に持っている）。**課金の防衛線はあくまで
  サーバー側の mutation / query 制限**で、`ProGate` は UX 用と割り切る
- webhook が落ちていた期間があっても、Stripe は最大3日再送する。手動での再送は
  Stripe ダッシュボードの Webhook ログから行える
