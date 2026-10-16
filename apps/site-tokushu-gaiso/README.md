# site-template

ホームページを持っていない会社に、先回りで作って見せるサイトの雛形。
app-factory 標準の構成（TanStack Start + Mantine v9、Cloudflare Workers）で、`apps/hello` をもとにしている。
中身は1社分の会社紹介ページだけで、DB・認証・課金は使わない。

## 1社分のサイトを作る手順

1. 雛形をコピーする

   ```bash
   cp -r apps/site-template apps/site-<会社のslug>
   ```

2. `package.json` と `wrangler.jsonc` の `name` を `site-<会社のslug>` に変える（Worker 名 = URL）
3. `src/site.config.ts` を書き換える。会社名・業種・キャッチコピー・サービス・強み・連絡先・色はすべてここにある
4. `public/images/` の写真を差し替え、`site.config.ts` の `src` を合わせる（jpg、長辺 1200px・ヒーローは 2000px 程度）。写真の選び方は下の「写真」を参照
5. ビルドとプレビュー

   ```bash
   cd apps/site-<会社のslug>
   vp install
   vp run build      # vite build + tsc
   vp run preview    # ビルド結果を Workers ランタイムで表示
   ```

6. デプロイは `vp run deploy`（build のあと `wrangler deploy`。`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が要る）

`stats`・`gallery`・`flow`・`voices`・`faq` は省略するとセクションごと消える（ナビの項目も連動する）。`about.photo`・`services[].photo`・`strengths[].photo` も省略できる。

## 写真

1. **その会社が公開している写真を最優先する。** Google マップの写真、Instagram、チラシなど。施工事例は実物でないと意味が薄い
2. 足りない分はフリー素材で埋める。商用利用可・クレジット不要のもの（Pexels、ぱくたそ など）を使い、出典を `public/images/CREDITS.md` に残す
3. フリー素材の人物を「代表」や「スタッフ」として見せない。人物は手元や後ろ姿にとどめる
4. お客様の声（`voices`）は実在の口コミだけを載せる。サンプルの文面は架空なので、実在の会社では Google の口コミを本人の了承を得て使うか、項目ごと消す

サンプルの写真は Pexels から選んだ（`public/images/CREDITS.md`）。

## 提案用サンプルとしての表示

`site.isProposal: true`（既定）のあいだは次の状態になる。

- ページ上部に「〇〇様へのご提案用に〜が作成したサンプルです」の帯を出す
- `<meta name="robots" content="noindex, nofollow">` と `robots.txt` の `Disallow: /` で検索エンジンに載せない

先方の許可なく本物の会社サイトに見える状態で公開しないための既定。契約後に本公開するときだけ `false` にし、`site.url` を本番ドメインに変える。
