#!/usr/bin/env bash
# 新規アプリを Clerk 認証に対応させる。
#
# 使い方: scripts/clerk-provision.sh <app-name>
#
# やること:
#   1. Cloudflare の workers.dev サブドメインからアプリの本番URLを組み立てる
#   2. Clerk インスタンスの allowed_origins にそのURLとlocalhostを追加する
#   3. apps/<app-name>/.env.local に VITE_CLERK_PUBLISHABLE_KEY を書き込む
#   4. publishable key から issuer domain を導出し、Convex デプロイメントに
#      CLERK_JWT_ISSUER_DOMAIN を設定する（convex-provision.sh 実行済みが前提）
#
# 必要な環境変数: CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY,
#                  CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 環境変数が無ければリポジトリ直下の .env から読み込む（ローカル実行用）
if [ -z "${CLERK_SECRET_KEY:-}" ] && [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "usage: $0 <app-name>" >&2
  exit 1
fi

: "${CLERK_SECRET_KEY:?CLERK_SECRET_KEY が未設定です}"
: "${CLERK_PUBLISHABLE_KEY:?CLERK_PUBLISHABLE_KEY が未設定です}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN が未設定です}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID が未設定です}"

APP_DIR="$REPO_ROOT/apps/$APP_NAME"
if [ ! -d "$APP_DIR" ]; then
  echo "error: apps/$APP_NAME がありません。先に apps/hello をコピーしてアプリを作成してください。" >&2
  exit 1
fi

# api <METHOD> <url> [json-body] [auth-header] — レスポンスbodyをstdoutへ。2xx以外はエラー表示して終了。
api() {
  local method="$1" url="$2" body="${3:-}" auth="$4"
  local args=(-sS -X "$method" "$url"
    -H "Authorization: Bearer $auth"
    -H "Content-Type: application/json"
    -w $'\n%{http_code}')
  if [ -n "$body" ]; then
    args+=(-d "$body")
  fi
  local out status resp
  out="$(curl "${args[@]}")"
  status="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "error: $method $url -> HTTP $status" >&2
    echo "$resp" >&2
    exit 1
  fi
  printf '%s' "$resp"
}

echo "==> workers.dev サブドメインを取得しています..."
SUBDOMAIN_RESP="$(api GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" "" "$CLOUDFLARE_API_TOKEN")"
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

echo "==> Clerk の allowed_origins を更新しています..."
INSTANCE_RESP="$(api GET "https://api.clerk.com/v1/instance" "" "$CLERK_SECRET_KEY")"
MERGED_ORIGINS_BODY="$(printf '%s' "$INSTANCE_RESP" | python3 -c '
import json, sys

data = json.load(sys.stdin)
existing = data.get("allowed_origins") or []
if not isinstance(existing, list):
    existing = []

app_url = sys.argv[1]
new_origins = [app_url, "http://localhost:5173"]

merged = list(existing)
for origin in new_origins:
    if origin not in merged:
        merged.append(origin)

print(json.dumps({"allowed_origins": merged}))
' "$APP_URL")"

api PATCH "https://api.clerk.com/v1/instance" "$MERGED_ORIGINS_BODY" "$CLERK_SECRET_KEY" > /dev/null
echo "    allowed_origins を更新しました。"

ENV_FILE="$APP_DIR/.env.local"
if [ -e "$ENV_FILE" ] && grep -q '^VITE_CLERK_PUBLISHABLE_KEY=' "$ENV_FILE"; then
  echo "==> $ENV_FILE に VITE_CLERK_PUBLISHABLE_KEY は既に設定済みのためスキップします。"
else
  echo "VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY" >> "$ENV_FILE"
  echo "==> $ENV_FILE に VITE_CLERK_PUBLISHABLE_KEY を書き込みました。"
fi

echo "==> issuer domain を導出しています..."
ISSUER="$(python3 -c '
import base64
import sys

key = sys.argv[1]
for prefix in ("pk_test_", "pk_live_"):
    if key.startswith(prefix):
        key = key[len(prefix):]
        break

padded = key + "=" * (-len(key) % 4)
decoded = base64.b64decode(padded).decode("utf-8")
decoded = decoded.rstrip("$")
print("https://" + decoded)
' "$CLERK_PUBLISHABLE_KEY")"
echo "    ISSUER: $ISSUER"

if [ -e "$ENV_FILE" ] && grep -q '^CONVEX_DEPLOY_KEY=' "$ENV_FILE"; then
  echo "==> Convex デプロイメントに CLERK_JWT_ISSUER_DOMAIN を設定しています..."
  (cd "$APP_DIR" && npx convex env set CLERK_JWT_ISSUER_DOMAIN "$ISSUER")
else
  echo "warning: $ENV_FILE に CONVEX_DEPLOY_KEY がありません。" >&2
  echo "先に scripts/convex-provision.sh を実行してから再実行してください。" >&2
  echo "（allowed_origins の更新は既に完了しています。再実行しても冪等なので問題ありません）" >&2
  exit 1
fi

echo
echo "完了しました。"
echo "  APP_URL: $APP_URL"
echo "  issuer:  $ISSUER"
echo
echo "次のステップ（apps/$APP_NAME 内で実行）:"
echo "  1. npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL"
echo "  2. wrangler deploy"
