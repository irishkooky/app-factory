# Jev 実験室

Cloudflare Workers 上で Vercel AI Gateway の `typesafe-ai/jev` を使う、日本語の意思決定ゲームです。表示される登場人物と状況はすべて架空です。

- **廊下のすれ違い**: 6人が同時に判断し、譲り合いの渋滞を抜けます。
- **飲み会からの脱出**: 店内イベントを見ながら、帰宅に必要な手順を選びます。

判断はクリック時にだけ実行し、結果は Vercel AI Gateway 経由の Jev 応答だけを表示します。無料枠の利用回数制限では停止メッセージを表示します。

## 検証

`vp run build` と `vp run test` を実行します。

## 設定と料金

Jev の料金は Vercel AI Gateway のモデル料金に従います。Cloudflare Workers の公開環境では `AI_GATEWAY_API_KEY` を Worker secret として設定してください。ローカル開発では、Git 管理されない `.dev.vars` に次を設定します。

```text
AI_GATEWAY_API_KEY=...
```

機密情報はゲームの入力に含めないでください。
