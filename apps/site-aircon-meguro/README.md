# site-aircon-meguro

エアコンメンテナンス目黒（目黒区柿の木坂のエアコン分解クリーニング）への提案用サイト。https://aircon-meguro.sonnet.co.jp

`apps/site-yoda-setsubi` から作り、エアコン屋向けに部品と中身を作り直している（太いゴシックの見出し、深い青緑とミントの配色、風のロゴ案）。
DB・認証・課金は使わない。

## 中身の出どころ

文面と数字はすべて公開情報から取り、確かめられないこと（代表者名・創業年・定価表など）は書かない。

| 載せているもの | 出どころ |
|---|---|
| 住所（丁目まで）・電話・受付時間・Googleマップの評価と件数 | Places API (New) |
| 作業写真（先方とお客さまが Googleマップに載せたもの） | Places API (New) の写真。表示のたびに取る |
| 人数（2人）・外注なし・損害保険・料金の実例 | ミツモアの掲載ページとクチコミ |
| 選ばれる理由・FAQ の対応内容 | Googleマップのクチコミを要約（原文は載せない） |
| 2027年の省エネ基準・東京ゼロエミポイント | 目黒区の案内、nippon.com |
| 対応エリアの地図 | 国土数値情報（行政区域データ）2024、HeartRails Geo API（国土交通省「位置参照情報」） |

自宅兼の事業所なので、住所は丁目までにし、地図の店の位置も 100m ほどの目安に丸めている。

## 作りの決まり

- 色は `src/theme.ts` の `color` だけが正。`__root.tsx` が CSS 変数（`--st-*`）にして配る
- 中身は `src/site.config.ts` にまとめる。部品（`src/components/`）には店ごとの文言を書かない
- 区切りの順は メニュー → 作業写真 → 料金 → 選ばれる理由 → 目安（エアコンの汚れ）→ 流れ → エリア → FAQ → 店舗案内
- 区切りの番号は CSS の counter で振るので、出さない区切り（写真が無い、`prices` を省いた など）があっても飛ばない
- 受付時間が公開されていない店は `hours: ''`・`schedule: []` にすると、受付時間と「ただいま受付中」を出さない
- 大きい市は地図を店のまわりだけにして、点線の距離を `area.rings` で変える
- 同じ型で site-aircrin-shinohara・site-seto-kucho・site-nakamura-suido・site-home-sukete を作っている

## Googleマップの写真と評価

`src/server/place.ts` がサーバー側で Places API (New) を呼び、評価・件数・写真の配信 URL をページに渡す。
規約で写真と評価は保存できないので、リポジトリにも Worker にも置かず、表示のたびに取る。写真の下には帰属表示を出す。
OG 画像にも写真と評価は使わず、文字とロゴだけにしている。

- キーは Worker の secret `GOOGLE_MAPS_API_KEY`（`vp exec wrangler secret put GOOGLE_MAPS_API_KEY`）
- 手元で写真まで見るときは、このディレクトリの `.dev.vars` に `GOOGLE_MAPS_API_KEY=...` を書く（git に入れない）
- キーが無い・API が失敗したときは、写真なしの見た目になる（評価は `site.config.ts` の値）
- 写真ごとの題・メニュー・作業前後の組は `site.config.ts` の `google.photoNotes` に、元画像の幅×高さで書く

## 地図

`src/data/area-map.ts` は国土数値情報と HeartRails Geo API のデータから作った SVG の座標。手で直さず、作り直すときはファイルごと差し替える。
地図に出す町の名前は `Area.tsx` が重ならないものだけ選ぶ。町の一覧は店からの直線距離（2km・4km）で組に分ける。

## ビルドとデプロイ

```bash
cd apps/site-aircon-meguro
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
