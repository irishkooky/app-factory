# Jev 実験室

Cloudflare Workers 上で Vercel AI Gateway の `typesafe-ai/jev` を使い、10件ずつの入力を高速に仕分ける日本語デモです。表示データはすべて架空です。

実務・遊びの各5企画を収録し、10/20/50/100件を順次処理します。無料枠ではモデル側の429で自動停止し、残りだけを再開できます。

## 検証

`vp run build` と `vp run test` を実行します。

## 料金

Jev は Vercel AI Gateway のモデル料金に従います。Cloudflare の公開環境では `AI_GATEWAY_API_KEY` を Worker secret として設定してください。ローカル開発では、Git 管理されない `.dev.vars` に `AI_GATEWAY_API_KEY=...` を設定します。機密情報は入力しないでください。
