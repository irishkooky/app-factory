# Jev 気づくフォーム

Cloudflare Workers 上で Vercel AI Gateway の `typesafe-ai/jev` を使う、意味を確かめるフォームのデモです。形式だけでは見つからない、名前と会社名の入れ替わり・問い合わせ先・具体性を、固定の選択肢として判断します。入力例はすべて架空です。

ホームでは1件ずつ、または8件を1リクエストで評価できます。メールアドレスは意味判断のモデル入力に送られません。以前の「日常あるある劇場」は [/theater](/theater) で引き続き試せます。

## 検証

`vp run build` と `vp run test` を実行します。

## 設定と料金

Jev の料金は Vercel AI Gateway のモデル料金に従います。Cloudflare Workers の公開環境では `AI_GATEWAY_API_KEY` を Worker secret として設定してください。ローカル開発では、Git 管理されない `.dev.vars` に次を設定します。

```text
AI_GATEWAY_API_KEY=...
```

機密情報はデモ入力に含めないでください。

## 意味判断から UI へ

Jev の選択結果をそのまま画面部品にはせず、選択確率が 0.70 以上のときだけ固定カタログの `UiPlan` に変換し、Mantine で描画します。この値は UI を分けるための選択確率であり、実世界での正解率ではありません。同じ判断 JSON なら同じ UI になりますが、AI の意味判断自体は毎回同一とは限りません。

実装は [Vercel AI Gateway の Evaluation](https://vercel.com/docs/ai-gateway/modalities/evaluation) を使い、[json-render](https://json-render.dev/) のカタログ型の考え方を参考にしています。`json-render` パッケージは導入しておらず、任意の生成 UI を実行しない小さな独自 renderer です。
