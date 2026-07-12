#!/usr/bin/env bash
# 新規アプリに Stripe（Free/Pro サブスク課金）をプロビジョニングする。
#
# 使い方: scripts/stripe-provision.sh <app-name> [monthly-price-jpy]
#          monthly-price-jpy は省略時 300
#
# やること:
#   1. apps/<app-name>/.env.local の VITE_CONVEX_URL から Convex deployment 名を導出し、
#      webhook URL（https://<deployment>.convex.site/stripe/webhook）を組み立てる
#   2. Cloudflare の workers.dev サブドメインからアプリの本番URLを組み立てる
#   3. Stripe に Pro プラン用の Product / Price を作成する（既存があれば再利用）
#   4. Stripe Customer Portal の設定を作成する（既存があれば再利用）
#   5. Stripe Webhook endpoint を作成する（既存かつ署名シークレットがConvexにあれば再利用）
#   6. Stripe関連のシークレット・IDを apps/<app-name> の Convex デプロイメントに設定する
#      （Stripeの秘密はCloudflare Workers側には置かない）
#
# 必要な環境変数: STRIPE_SECRET_KEY（テストモードの sk_test_ / rk_test_ のみ受け付け）,
#                  CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
#
# 前提: apps/<app-name> に対して先に scripts/convex-provision.sh 実行済みであること
#       （apps/<app-name>/.env.local に CONVEX_DEPLOY_KEY / VITE_CONVEX_URL があること）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 環境変数が無ければリポジトリ直下の .env から読み込む（ローカル実行用）
if [ -z "${STRIPE_SECRET_KEY:-}" ] && [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "usage: $0 <app-name> [monthly-price-jpy]" >&2
  exit 1
fi
MONTHLY_PRICE_JPY="${2:-300}"

: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY が未設定です}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN が未設定です}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID が未設定です}"

# 実課金防止のためテストモードの鍵のみ受け付ける。鍵の値そのものは絶対に出力しない。
case "$STRIPE_SECRET_KEY" in
  sk_test_*|rk_test_*) ;;
  *)
    echo "error: STRIPE_SECRET_KEY がテストモードの鍵（sk_test_ / rk_test_ で始まる）ではありません。" >&2
    echo "実課金防止のため、このスクリプトはテストモードの鍵のみ受け付けます。" >&2
    exit 1
    ;;
esac

APP_DIR="$REPO_ROOT/apps/$APP_NAME"
if [ ! -d "$APP_DIR" ]; then
  echo "error: apps/$APP_NAME がありません。先に apps/hello をコピーしてアプリを作成してください。" >&2
  exit 1
fi

ENV_FILE="$APP_DIR/.env.local"
if [ ! -e "$ENV_FILE" ] || ! grep -q '^CONVEX_DEPLOY_KEY=' "$ENV_FILE" || ! grep -q '^VITE_CONVEX_URL=' "$ENV_FILE"; then
  echo "error: $ENV_FILE に CONVEX_DEPLOY_KEY / VITE_CONVEX_URL がありません。" >&2
  echo "先に scripts/convex-provision.sh を実行してください。" >&2
  exit 1
fi

# stripe_api <METHOD> <path> [-d data-urlencode-args...] — レスポンスbodyをstdoutへ。2xx以外はエラー表示して終了。
# Stripe API は form-urlencoded なので、可変長の --data-urlencode 引数をそのまま渡す。
stripe_api() {
  local method="$1" path="$2"
  shift 2
  local args=(-sS -X "$method" "https://api.stripe.com$path"
    -u "$STRIPE_SECRET_KEY:"
    -w $'\n%{http_code}')
  local arg
  for arg in "$@"; do
    args+=(--data-urlencode "$arg")
  done
  local out status resp
  out="$(curl "${args[@]}")"
  status="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "error: $method $path -> HTTP $status" >&2
    echo "$resp" >&2
    exit 1
  fi
  printf '%s' "$resp"
}

# stripe_api_get <path-with-query> — GETをクエリパラメータ付きで呼ぶ版（-G --data-urlencode）。
stripe_api_get() {
  local path="$1"
  shift
  local args=(-sS -G -X GET "https://api.stripe.com$path"
    -u "$STRIPE_SECRET_KEY:"
    -w $'\n%{http_code}')
  local arg
  for arg in "$@"; do
    args+=(--data-urlencode "$arg")
  done
  local out status resp
  out="$(curl "${args[@]}")"
  status="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "error: GET $path -> HTTP $status" >&2
    echo "$resp" >&2
    exit 1
  fi
  printf '%s' "$resp"
}

# json_get <key> — stdinのJSONからトップレベルの値を1つ取り出す
json_get() {
  python3 -c '
import json, sys
data = json.load(sys.stdin)
key = sys.argv[1]
if key not in data or data[key] is None:
    sys.exit("error: レスポンスに " + key + " がありません: " + json.dumps(data)[:300])
print(data[key])
' "$1"
}

echo "==> Convex deployment を解決しています..."
VITE_CONVEX_URL="$(grep '^VITE_CONVEX_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
CONVEX_DEPLOYMENT="$(python3 -c '
import sys
from urllib.parse import urlparse

url = sys.argv[1]
host = urlparse(url).hostname or ""
suffix = ".convex.cloud"
if not host.endswith(suffix):
    sys.stderr.write("error: VITE_CONVEX_URL の形式が想定外です: " + url + "\n")
    sys.exit(1)
print(host[: -len(suffix)])
' "$VITE_CONVEX_URL")"
WEBHOOK_URL="https://${CONVEX_DEPLOYMENT}.convex.site/stripe/webhook"
echo "    webhook URL: $WEBHOOK_URL"

echo "==> workers.dev サブドメインを取得しています..."
SUBDOMAIN_RESP="$(curl -sS -X GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")"
SUBDOMAIN="$(printf '%s' "$SUBDOMAIN_RESP" | python3 -c '
import json, sys
data = json.load(sys.stdin)
if not data.get("success"):
    sys.stderr.write(json.dumps(data)[:500] + "\n")
    sys.exit(1)
result = data.get("result") or {}
subdomain = result.get("subdomain")
if not subdomain:
    sys.stderr.write("error: レスポンスに result.subdomain がありません: " + json.dumps(data)[:500] + "\n")
    sys.exit(1)
print(subdomain)
')"
APP_URL="https://${APP_NAME}.${SUBDOMAIN}.workers.dev"
echo "    APP_URL: $APP_URL"

echo "==> Product '$APP_NAME Pro' を解決しています..."
PRODUCT_SEARCH="$(stripe_api_get "/v1/products/search" "query=metadata['app']:'${APP_NAME}' AND active:'true'")"
PRODUCT_ID="$(printf '%s' "$PRODUCT_SEARCH" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("data") or []
print(items[0]["id"] if items else "")
')"
if [ -n "$PRODUCT_ID" ]; then
  echo "    既存の Product を再利用します: $PRODUCT_ID"
else
  PRODUCT_RESP="$(stripe_api POST "/v1/products" \
    "name=${APP_NAME} Pro" \
    "metadata[app]=${APP_NAME}")"
  PRODUCT_ID="$(printf '%s' "$PRODUCT_RESP" | json_get id)"
  echo "    Product を作成しました: $PRODUCT_ID"
fi

echo "==> Price（月額 ${MONTHLY_PRICE_JPY} 円）を解決しています..."
PRICE_LIST="$(stripe_api_get "/v1/prices" "product=${PRODUCT_ID}" "active=true" "limit=100")"
PRICE_ID="$(printf '%s' "$PRICE_LIST" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("data") or []
for item in items:
    recurring = item.get("recurring") or {}
    if recurring.get("interval") == "month" and item.get("currency") == "jpy":
        print(item["id"])
        break
')"
if [ -n "$PRICE_ID" ]; then
  echo "    既存の Price を再利用します: $PRICE_ID"
  EXISTING_AMOUNT="$(printf '%s' "$PRICE_LIST" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("data") or []
target = sys.argv[1]
for item in items:
    if item["id"] == target:
        print(item.get("unit_amount", ""))
        break
' "$PRICE_ID")"
  if [ -n "$EXISTING_AMOUNT" ] && [ "$EXISTING_AMOUNT" != "$MONTHLY_PRICE_JPY" ]; then
    echo "warning: 既存Priceの金額（${EXISTING_AMOUNT}円）が指定額（${MONTHLY_PRICE_JPY}円）と異なりますが、既存のものを再利用します。" >&2
    echo "warning: 金額を変更したい場合はStripeダッシュボードで新しいPriceを作成し、Productのdefault priceを切り替えてください（Priceは作成後変更不可）。" >&2
  fi
else
  PRICE_RESP="$(stripe_api POST "/v1/prices" \
    "product=${PRODUCT_ID}" \
    "currency=jpy" \
    "unit_amount=${MONTHLY_PRICE_JPY}" \
    "recurring[interval]=month")"
  PRICE_ID="$(printf '%s' "$PRICE_RESP" | json_get id)"
  echo "    Price を作成しました: $PRICE_ID"
fi

echo "==> Customer Portal 設定を解決しています..."
PORTAL_LIST="$(stripe_api_get "/v1/billing_portal/configurations" "active=true" "limit=100")"
PORTAL_CONFIG_ID="$(printf '%s' "$PORTAL_LIST" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("data") or []
if not items:
    print("")
else:
    default = next((i for i in items if i.get("is_default")), None)
    print((default or items[0])["id"])
')"
if [ -n "$PORTAL_CONFIG_ID" ]; then
  echo "    既存の Portal 設定を再利用します: $PORTAL_CONFIG_ID"
else
  PORTAL_RESP="$(stripe_api POST "/v1/billing_portal/configurations" \
    "features[invoice_history][enabled]=true" \
    "features[payment_method_update][enabled]=true" \
    "features[subscription_cancel][enabled]=true" \
    "features[subscription_cancel][mode]=at_period_end")"
  PORTAL_CONFIG_ID="$(printf '%s' "$PORTAL_RESP" | json_get id)"
  echo "    Portal 設定を作成しました: $PORTAL_CONFIG_ID"
fi

echo "==> Webhook endpoint を解決しています..."
WEBHOOK_LIST="$(stripe_api_get "/v1/webhook_endpoints" "limit=100")"
EXISTING_WEBHOOK_ID="$(printf '%s' "$WEBHOOK_LIST" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("data") or []
target = sys.argv[1]
for item in items:
    if item.get("url") == target:
        print(item["id"])
        break
' "$WEBHOOK_URL")"

WEBHOOK_SECRET=""
if [ -n "$EXISTING_WEBHOOK_ID" ]; then
  EXISTING_SECRET="$(cd "$APP_DIR" && npx convex env get STRIPE_WEBHOOK_SECRET 2>/dev/null || true)"
  EXISTING_SECRET="$(printf '%s' "$EXISTING_SECRET" | tr -d '[:space:]')"
  if [ -n "$EXISTING_SECRET" ]; then
    echo "    既存の Webhook endpoint とConvex側の署名シークレットをそのまま維持します: $EXISTING_WEBHOOK_ID"
  else
    echo "    既存の Webhook endpoint はありますが、Convex側に署名シークレットがないため作り直します。"
    stripe_api DELETE "/v1/webhook_endpoints/$EXISTING_WEBHOOK_ID" > /dev/null
    WEBHOOK_RESP="$(stripe_api POST "/v1/webhook_endpoints" \
      "url=${WEBHOOK_URL}" \
      "enabled_events[]=checkout.session.completed" \
      "enabled_events[]=customer.subscription.updated" \
      "enabled_events[]=customer.subscription.deleted")"
    WEBHOOK_SECRET="$(printf '%s' "$WEBHOOK_RESP" | json_get secret)"
    echo "    Webhook endpoint を再作成しました。"
  fi
else
  WEBHOOK_RESP="$(stripe_api POST "/v1/webhook_endpoints" \
    "url=${WEBHOOK_URL}" \
    "enabled_events[]=checkout.session.completed" \
    "enabled_events[]=customer.subscription.updated" \
    "enabled_events[]=customer.subscription.deleted")"
  WEBHOOK_SECRET="$(printf '%s' "$WEBHOOK_RESP" | json_get secret)"
  echo "    Webhook endpoint を作成しました。"
fi

echo "==> Convex デプロイメントにシークレットを設定しています ($CONVEX_DEPLOYMENT)..."
(
  cd "$APP_DIR"
  npx convex env set STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
  if [ -n "$WEBHOOK_SECRET" ]; then
    npx convex env set STRIPE_WEBHOOK_SECRET "$WEBHOOK_SECRET"
  fi
  npx convex env set STRIPE_PRICE_ID "$PRICE_ID"
  npx convex env set STRIPE_PORTAL_CONFIG_ID "$PORTAL_CONFIG_ID"
  npx convex env set APP_URL "$APP_URL"
) > /dev/null

echo
echo "完了しました。"
echo "  product:     $PRODUCT_ID"
echo "  price:       $PRICE_ID（月額 ${MONTHLY_PRICE_JPY} 円）"
echo "  portal:      $PORTAL_CONFIG_ID"
echo "  webhook URL: $WEBHOOK_URL"
echo "  APP_URL:     $APP_URL"
echo "  Convex env:  STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID / STRIPE_PORTAL_CONFIG_ID / APP_URL"
echo
echo "次のステップ（apps/$APP_NAME 内で実行）:"
echo "  1. convex/billing.ts 等の課金用Convex関数を実装する（docs/billing.md 参照）"
echo "  2. npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL"
echo "  3. wrangler deploy"
