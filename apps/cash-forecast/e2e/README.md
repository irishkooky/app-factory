# Clerk E2E（認証済み UI スクショ）

Google OAuth を自動化せず、`@clerk/testing` の Backend API サインインでログイン後 UI を撮る。

## 必要なシークレット（Cloud Agent Secrets / 環境変数）

| 変数 | 必須 | 説明 |
|---|---|---|
| `CLERK_SECRET_KEY` | yes | 共有 **development** Clerk インスタンスの Secret Key |
| `CLERK_PUBLISHABLE_KEY` | yes | 同上の Publishable Key（`pk_test_…`） |
| `E2E_CLERK_USER_EMAIL` | no | 既定 `cash-forecast-e2e+clerk_test@example.com` |
| `E2E_BASE_URL` | no | 既定 `https://cash-forecast.ichigoooo.workers.dev` |
| `E2E_VIDEO` | no | `1` で Playwright video も保存 |

`+clerk_test` 付きメールは Clerk が配信を抑制する。製品 UI の「Googleでログイン」はそのまま。Email を公開サインイン手段として有効化する必要はない（`clerk.signIn({ emailAddress })` は Backend API）。

## 実行

```bash
cd apps/cash-forecast
# .env.local に CONVEX_DEPLOY_KEY が必要（ensure-e2e-pro が Convex 経由で Stripe trial を付ける）
vp run e2e:clerk
# または段階実行:
vp run e2e:clerk-user
vp run e2e:clerk-pro
vp run e2e:clerk-screenshot
```

`e2e:clerk-pro` は Convex の `admin:ensureE2ePro` を呼ぶ。デプロイメント上の
`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` でテストモードの Customer + trialing サブスクを作り、
`subscriptions` を upsert する（Cloud Agent に `STRIPE_SECRET_KEY` を置かなくてもよい）。
既に active/trialing なら冪等にスキップする。

スクショ出力:

- `apps/cash-forecast/e2e/artifacts/*.png`（リポジトリ側）
- `/cursor/stores/self/media/clerk-e2e/*.png`（Project store）

## Dashboard 手動手順（API 作成が失敗したとき）

1. Clerk Dashboard（development）→ Users → Create user
2. Email を `cash-forecast-e2e+clerk_test@example.com` にする
3. 公開の Sign-in options は Google のままでよい

Pro を Dashboard だけで付ける場合（非推奨・非耐久）: Stripe Checkout を手動決済するか、
Convex ダッシュボードから `admin:ensureE2ePro` を同じ引数で実行する。
