# site-yoda-setsubi

依田設備（横浜市金沢区釜利谷西の水道屋）への提案用サイト。https://yoda-setsubi.sonnet.co.jp

`apps/site-template` から作ったが、見た目と部品は依田設備のために作り直している（明朝の見出し、紺と真鍮の配色、しずくのロゴ案）。
DB・認証・課金は使わない。

## 中身の出どころ

文面と数字はすべて公開情報から取り、確かめられないこと（代表者名・創業年・出張費など）は書かない。

| 載せているもの | 出どころ |
|---|---|
| 住所・電話・受付時間・Googleマップの評価と件数 | Places API (New) |
| 施工写真（先方が Googleマップに載せたもの） | Places API (New) の写真。表示のたびに取る |
| 横浜市指定給水装置工事事業者 第5296号 | 横浜市水道局「指定給水装置工事事業者リスト」 |
| メーター下流側漏水修繕事業者リスト（金沢区） | 横浜市水道局の同リスト |
| 選ばれる理由・FAQ の対応内容 | Googleマップのクチコミを要約（原文は載せない） |
| 漏水の減額の説明 | 横浜市「漏水（水漏れ）に伴う水道料金等の減額について」 |
| 対応エリアの地図 | 国土数値情報（行政区域データ）2024、国土地理院「地名等検索」 |

横浜市の排水設備指定工事店の一覧には載っていないので、その指定は書かない。

## Googleマップの写真と評価

`src/server/place.ts` がサーバー側で Places API (New) を呼び、評価・件数・写真の配信 URL をページに渡す。
規約で写真と評価は保存できないので、リポジトリにも Worker にも置かず、表示のたびに取る。写真の下には帰属表示を出す。

- キーは Worker の secret `GOOGLE_MAPS_API_KEY`（`vp exec wrangler secret put GOOGLE_MAPS_API_KEY`）
- 手元で写真まで見るときは、このディレクトリの `.env` に `GOOGLE_MAPS_API_KEY=...` を書く（`.env*` は git に入らない）
- キーが無い・API が失敗したときは、写真なしの見た目になる（評価は `site.config.ts` の値）
- 写真ごとの題・金額・施工前後の組は `site.config.ts` の `google.photoNotes` に、API が返す順で書く。
  元画像の幅×高さが合わない写真には説明を付けない（先方が写真を足すと順番がずれるため）

## 地図

`src/data/kanazawa-map.ts` は国土数値情報と国土地理院のデータから作った SVG の座標。手で直さず、作り直すときはファイルごと差し替える。
対応エリアの町は、店からの直線距離（2km・4km）で組に分けて出す。

## ビルドとデプロイ

```bash
cd apps/site-yoda-setsubi
vp install
vp run build      # vite build + tsc
```

sonnet.co.jp のアカウントに出す（`wrangler.jsonc` の routes が custom domain）。

```bash
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_SONNET_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_SONNET_ACCOUNT_ID vp exec wrangler deploy
```

## 提案用サンプルとしての表示

`site.isProposal: true` のあいだは、ページ上部に提案用の帯を出し、`noindex` と `robots.txt` の `Disallow: /` で検索エンジンに載せない。
契約後に本公開するときだけ `false` にする。
