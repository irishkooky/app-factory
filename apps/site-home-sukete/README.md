# site-home-sukete

超便利屋！ホーム助っ人（越谷市袋山の便利屋（窓ガラス・鍵・家具の組み立てなど））への提案用サイト。https://home-sukete.sonnet.co.jp

`apps/site-aircon-meguro` を型にして作り、中身・配色・ロゴ・地図・目安の絵をこの店に合わせている（深い緑と橙の配色、家と「＋」のロゴ案、熱割れの絵）。
DB・認証・課金は使わない。

## 中身の出どころ

文面と数字はすべて公開情報から取り、確かめられないこと（代表者名・創業年・料金表など）は書かない。

| 載せているもの | 出どころ |
|---|---|
| 住所（町名まで）・電話・受付時間・Googleマップの評価と件数 | Places API (New) |
| 作業写真（先方が Googleマップに載せたもの）・坂戸市や吉川市での作業 | Places API (New) の写真と、写真に書かれた地名 |
| 選ばれる理由・FAQ の対応内容 | Googleマップのクチコミを要約（原文は載せない） |
| 熱割れのしくみ | 日本板硝子「ガラスワンダーランド」 |
| 対応エリアの地図 | 国土数値情報（行政区域データ）2024、HeartRails Geo API（国土交通省「位置参照情報」） |

住所は集合住宅なので町名までにしている。LINE の URL は分からないので載せていない（先方に聞いてから足す）。

## 作りの決まり

- 色は `src/theme.ts` の `color` だけが正。`__root.tsx` が CSS 変数（`--st-*`）にして配る
- 中身は `src/site.config.ts` にまとめる。部品（`src/components/`）には店ごとの文言を書かない（目安の絵 `Guide.tsx` の `Illustration` だけは業種ごと）
- 区切りの番号は CSS の counter で振るので、出さない区切りがあっても飛ばない

## Googleマップの写真と評価

`src/server/place.ts` がサーバー側で Places API (New) を呼び、評価・件数・写真の配信 URL をページに渡す。
規約で写真と評価は保存できないので、リポジトリにも Worker にも置かず、表示のたびに取る。写真の下には帰属表示を出す。
OG 画像にも写真と評価は使わず、文字とロゴだけにしている。

- キーは Worker の secret `GOOGLE_MAPS_API_KEY`（`vp exec wrangler secret put GOOGLE_MAPS_API_KEY`）
- 手元で写真まで見るときは、このディレクトリの `.dev.vars` に `GOOGLE_MAPS_API_KEY=...` を書く（git に入れない）
- キーが無い・API が失敗したときは、写真なしの見た目になる（評価は `site.config.ts` の値）

## 地図

`src/data/area-map.ts` は国土数値情報と HeartRails Geo API のデータから作った SVG の座標。手で直さず、作り直すときはファイルごと差し替える。

## ビルドとデプロイ

```bash
cd apps/site-home-sukete
vp install
vp run build      # vite build + tsc
vp run dev        # 手元で見る
```

sonnet.co.jp のアカウントに出す（`wrangler.jsonc` の routes が custom domain）。

```bash
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_SONNET_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_SONNET_ACCOUNT_ID vp exec wrangler deploy
```

## 提案用サンプルとしての表示

`site.isProposal: true` のあいだは、ページ上部に提案用の帯を出し、`noindex` と `robots.txt` の `Disallow: /` で検索エンジンに載せない。
契約後に本公開するときだけ `false` にする。
