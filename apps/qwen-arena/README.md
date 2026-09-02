# Qwen Arena — 同じ仕事を、全部のモデルに投げる

SaaSに組み込む典型的なAI機能(分類・要約・抽出・翻訳・下書き)を、同じ入力で複数モデル(Qwen / Claude /
OpenAI / Gemini / DeepSeek)に同時に投げて、出力・レイテンシ・トークン・コストを横並びで比較するデモです。
Claude Opus 5 によるブラインド採点(モデル名を伏せた1〜5点評価)で品質差も数値化します。

## APIキーの入れ方

APIキーは後から `wrangler secret put` で入れます。**キー未設定でもアプリはビルド・デプロイ・表示ができ、
キーが無いプロバイダは「キー未設定」表示になります。**

### 本番

```sh
cd apps/qwen-arena
wrangler secret put DASHSCOPE_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put DEEPSEEK_API_KEY
```

### ローカル

```sh
cp .dev.vars.example .dev.vars
# .dev.vars を編集して値を入れる
vp dev
```

## 単価・モデルIDの直し方

`src/data/models.ts` の `MODELS` / `PROVIDERS` だけを編集してください。モデルID・単価(USD / 1Mトークン)・
デフォルトON/OFFなどはすべてここに集約されています。

## 各プロバイダのキー発行URL

- Qwen (Alibaba Cloud Model Studio **国際版**): https://modelstudio.console.alibabacloud.com/ (このアプリは `dashscope-intl` の国際版エンドポイントを叩くので、中国版 bailian.console.aliyun.com のキーは使えない)
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Gemini (Google AI Studio): https://aistudio.google.com/
- DeepSeek Platform: https://platform.deepseek.com/

## 公開後の後片付け(重要)

このアプリのURLは公開されます(`*.workers.dev`)。登壇・デモが終わったら、キーが漏洩・悪用されないよう
`wrangler secret delete <NAME>` で入れたキーを削除してください。

```sh
cd apps/qwen-arena
wrangler secret delete DASHSCOPE_API_KEY
wrangler secret delete ANTHROPIC_API_KEY
wrangler secret delete OPENAI_API_KEY
wrangler secret delete GEMINI_API_KEY
wrangler secret delete DEEPSEEK_API_KEY
```

キーを消してもアプリ自体は壊れません(各プロバイダが「キー未設定」表示に戻るだけです)。
