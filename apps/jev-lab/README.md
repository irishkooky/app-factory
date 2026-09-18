# Jev 実験室

Cloudflare Workers 上で Vercel AI Gateway の `typesafe-ai/jev` を使い、固定した評価基準で文章を分類・採点する日本語デモです。

実務モードは「問い合わせ仕分け」「商談の優先度」「会議いる？」「仕様の曖昧さ」「公開前文章チェック」、遊びモードは「遅刻の言い訳裁判」「必殺技名鑑定」「冷蔵庫の残り物オーディション」「我が家の猫は何代目の皇帝か」「世界一どうでもいい会議」を収録します。

## 検証

`vp run build` と `vp run test` を実行します。

## 料金

Jev は Vercel AI Gateway のモデル料金に従います。Cloudflare の公開環境では `AI_GATEWAY_API_KEY` を Worker secret として設定してください。ローカル開発では、Git 管理されない `.dev.vars` に `AI_GATEWAY_API_KEY=...` を設定します。機密情報は入力しないでください。
