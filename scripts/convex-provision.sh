#!/usr/bin/env bash
# Convex プロジェクトをヘッドレスでプロビジョニングする。
#
# 使い方: scripts/convex-provision.sh <app-name>
#
# やること:
#   1. Management API の /token_details で team ID を解決
#   2. prod デプロイメント付きの Convex プロジェクトを作成
#   3. そのデプロイメント専用のデプロイキーを発行
#   4. apps/<app-name>/.env.local に CONVEX_DEPLOY_KEY / VITE_CONVEX_URL を書き込む
#
# 必要な環境変数: CONVEX_TEAM_ACCESS_TOKEN（Convexダッシュボードで発行するTeam Access Token）
set -euo pipefail

API_BASE="https://api.convex.dev/v1"

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "usage: $0 <app-name>" >&2
  exit 1
fi

: "${CONVEX_TEAM_ACCESS_TOKEN:?CONVEX_TEAM_ACCESS_TOKEN が未設定です（ConvexダッシュボードでTeam Access Tokenを発行して設定してください）}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/$APP_NAME"
if [ ! -d "$APP_DIR" ]; then
  echo "error: apps/$APP_NAME がありません。先に apps/hello をコピーしてアプリを作成してください。" >&2
  exit 1
fi

ENV_FILE="$APP_DIR/.env.local"
if [ -e "$ENV_FILE" ] && grep -q '^CONVEX_DEPLOY_KEY=' "$ENV_FILE"; then
  echo "error: $ENV_FILE に CONVEX_DEPLOY_KEY が既にあります。" >&2
  echo "再プロビジョニングする場合は、Convexダッシュボードで既存プロジェクトを確認のうえ該当行を削除してから実行してください。" >&2
  exit 1
fi

# api <METHOD> <path> [json-body] — レスポンスbodyをstdoutへ。2xx以外はエラー表示して終了。
api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$API_BASE$path"
    -H "Authorization: Bearer $CONVEX_TEAM_ACCESS_TOKEN"
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
    echo "error: $method $path -> HTTP $status" >&2
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

echo "==> team ID を解決しています..."
TOKEN_DETAILS="$(api GET /token_details)"
TOKEN_TYPE="$(printf '%s' "$TOKEN_DETAILS" | json_get type)"
if [ "$TOKEN_TYPE" != "teamToken" ]; then
  echo "error: CONVEX_TEAM_ACCESS_TOKEN がチームトークンではありません（type=$TOKEN_TYPE）。" >&2
  echo "ダッシュボードの Team Settings から Team Access Token を発行してください。" >&2
  exit 1
fi
TEAM_ID="$(printf '%s' "$TOKEN_DETAILS" | json_get teamId)"

echo "==> プロジェクト '$APP_NAME' を作成しています (team $TEAM_ID)..."
CREATE_BODY="$(python3 -c 'import json,sys; print(json.dumps({"projectName": sys.argv[1], "deploymentType": "prod"}))' "$APP_NAME")"
CREATE_RESP="$(api POST "/teams/$TEAM_ID/create_project" "$CREATE_BODY")"
DEPLOYMENT_NAME="$(printf '%s' "$CREATE_RESP" | json_get deploymentName)"
DEPLOYMENT_URL="$(printf '%s' "$CREATE_RESP" | json_get deploymentUrl)"

echo "==> デプロイキーを発行しています ($DEPLOYMENT_NAME)..."
DEPLOY_KEY="$(api POST "/deployments/$DEPLOYMENT_NAME/create_deploy_key" '{"name":"app-factory"}' | json_get deployKey)"

{
  echo "CONVEX_DEPLOY_KEY=$DEPLOY_KEY"
  echo "VITE_CONVEX_URL=$DEPLOYMENT_URL"
} >> "$ENV_FILE"

echo
echo "完了しました。"
echo "  deployment: $DEPLOYMENT_NAME"
echo "  URL:        $DEPLOYMENT_URL"
echo "  認証情報:   apps/$APP_NAME/.env.local（gitignore済み）"
echo
echo "次のステップ（apps/$APP_NAME 内で実行）:"
echo "  1. vp add convex @convex-dev/react-query @tanstack/react-query @tanstack/react-router-ssr-query"
echo "  2. convex/ ディレクトリにスキーマ・関数を実装する（docs/convex.md 参照）"
echo "  3. npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL"
echo "  4. wrangler deploy"
