# Jev 実験室

Cloudflare Workers AI の `typesafe/jev` を使い、固定した評価基準で文章を分類・採点する日本語デモです。

実務モードは「問い合わせ仕分け」「商談の優先度」「会議いる？」「仕様の曖昧さ」「公開前文章チェック」、遊びモードは「遅刻の言い訳裁判」「必殺技名鑑定」「冷蔵庫の残り物オーディション」「我が家の猫は何代目の皇帝か」「世界一どうでもいい会議」を収録します。

## 検証

`vp run build` と `vp run test` を実行します。Workers AI binding の実行には Cloudflare 側の AI Gateway が必要です。

## 料金

Jev は AI Gateway と Unified Billing を利用します。利用前に Cloudflare ダッシュボードで **AI Gateway credits** の残高・課金設定を確認してください。アプリは `gateway: { id: 'default', collectLog: false }` を指定し、評価内容をゲートウェイログに収集しません。
