# site-template

ホームページを持っていない会社に、先回りで作って見せるサイトの雛形。
構成は sonnet-llc/corporate-website と同じ（Next.js 15 App Router + Tailwind CSS v4 + `@opennextjs/cloudflare` で Cloudflare Workers に載せる）。

app-factory の他のアプリ（TanStack Start + Mantine）とは技術スタックが違う。
納品先の会社に引き渡しやすく、corporate-website と同じ手順で運用できることを優先した。

## 1社分のサイトを作る手順

1. 雛形をコピーする

   ```bash
   cp -r apps/site-template apps/site-<会社のslug>
   ```

2. `package.json` と `wrangler.jsonc` の `name` を `site-<会社のslug>` に変える（Worker 名 = URL）
3. `src/site.config.ts` を書き換える。会社名・業種・キャッチコピー・サービス・強み・連絡先・色はすべてここにある
4. `public/images/` の写真を差し替え、`site.config.ts` の `src` を合わせる（jpg / webp でよい）
5. ビルドとプレビュー

   ```bash
   cd apps/site-<会社のslug>
   vp install
   vp run build      # next build（型チェック込み）
   vp run preview    # Workers ランタイム（wrangler dev）で http://localhost:8787
   ```

6. デプロイは `vp run deploy`（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が要る）

`gallery` を省略すると事例セクションとナビの項目が消える。`about.photo`・`services[].photo` も省略できる。

## 提案用サンプルとしての表示

`site.isProposal: true`（既定）のあいだは次の状態になる。

- ページ上部に「〇〇様へのご提案用に〜が作成したサンプルです」の帯を出す
- `<meta name="robots" content="noindex, nofollow">` と `robots.txt` の `Disallow: /` で検索エンジンに載せない

先方の許可なく本物の会社サイトに見える状態で公開しないための既定。契約後に本公開するときだけ `false` にし、`site.url` を本番ドメインに変える。
