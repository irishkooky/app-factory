# app-factory

## 1. このリポジトリについて

このリポジトリは「app factory」です。小さなWebアプリを大量生産するためのモノレポで、
Claude Code on the web（クラウドサンドボックス）から使われることを前提としています。

- `apps/` 配下の1フォルダ = 1アプリ = 1つのCloudflare Worker = 1つのURL（`<name>.workers.dev`）
- 各アプリは独立してビルド・デプロイされます（他アプリに依存しません）
- `apps/hello` は新規アプリ作成時にコピーする雛形（テンプレート）です

## 2. 技術スタック（固定・変更禁止）

- **フレームワーク**: TanStack Start（React 19）
- **UI**: 必ずMantine v9を使用する。テーマは雛形の `src/theme.ts` を流用すること
- **コマンド体系**: Vite+（`vp`）をコマンド体系として使用する
- **デプロイ先**: Cloudflare Workers
- **パッケージマネージャ**: pnpm。ただし直接叩かず、必ず `vp` 経由で操作する
  - `npm` / `pnpm` の直接実行は禁止

これらは固定の技術選定です。理由なく変更・置換しないこと。

## 3. コマンド規約

| 目的 | コマンド |
|---|---|
| 依存関係インストール | `vp install` |
| 開発サーバー起動 | `vp dev` |
| ビルド | `vp build` |
| テスト | `vp test` |
| 静的チェック | `vp check` |
| 依存追加 | `vp add <pkg>`（開発依存は `vp add -D <pkg>`） |
| ビルド検証 | 各アプリのディレクトリ内で `vp run build` を実行する |

## 4. 新規アプリの作り方（手順）

1. `apps/hello` を `apps/<kebab-case名>` にコピーする
2. `package.json` の `name` と `wrangler.jsonc` の `name` をフォルダ名に変更する
3. `vp install` を実行する
4. 実装する（ルートは `src/routes/` 配下に追加していく）
5. `vp run build` が通ることを確認する
6. `wrangler deploy` でデプロイする
   （`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` は環境変数として供給済み）
7. **作品一覧ポータルを更新する**（下記「作品一覧ポータル（apps/lab）」参照）
8. `git commit` して `push` する
9. PRを作成し、マージまで行う（下記「PRとマージの運用」参照）
10. **最後に必ずデプロイURL（`https://<name>.<account>.workers.dev`）とマージ結果を報告して終了する**

### 作品一覧ポータル（apps/lab）

`apps/` 配下の全アプリを一覧・検索できるポータル: https://lab.ichigoooo.workers.dev

アプリを新規追加したとき、および既存アプリの見た目を大きく変えたときは、最後にポータルを更新する:

1. `apps/lab/src/data/meta.ts` に表示名・説明・カテゴリ（`tool` / `game` / `demo`）・タグを追記する
   - 書かなくても一覧には出るが、slug がそのまま表示され説明が既定文になる
2. `cd apps/lab && vp run release` を実行する
   （一覧の再生成 → スクショ撮影 → 型生成 → build → deploy を一括で行う）
3. 生成物（`wrangler.jsonc` / `src/data/registry.gen.ts` / `public/shots/*.jpg` /
   `worker-configuration.d.ts`）を一緒にコミットする

一覧の順番と `No.` はWorkerの作成日から自動で決まるので手で振らない。
自動生成ファイルは手で編集しない。

## 5. 既存アプリの修正

1. `apps/<name>` で作業する
2. `vp run build`
3. `wrangler deploy`
4. 見た目が大きく変わったなら、ポータルのサムネイルを撮り直す
   （`cd apps/lab && vp run shots --only <name>`）
5. `commit` & `push`
6. PRを作成し、マージまで行う（下記「PRとマージの運用」参照）
7. URLとマージ結果を報告する

### PRとマージの運用

- 変更が `apps/` 配下のみで完結している場合: PRを作成し、**そのままマージまで自動で行う**（squash merge）。マージ後のリモートブランチは削除してよい
- `apps/` 以外の共有部分（AGENTS.md、雛形 `apps/hello`、ルートの設定ファイルなど）に触れた場合: PRの作成までに留め、**マージせずユーザーの確認を求める**（ユーザーから明示的な指示があればマージしてよい）
- このリポジトリではデプロイがマージより先に行われるため、マージは品質ゲートではなく「mainを本番の写しとして最新に保つ」ための作業。未マージのまま放置すると、次のセッション（mainから分岐）がそのアプリのコードを参照できなくなる。報告前に必ずマージまで完了させること
- なお `CLAUDE.md` は `AGENTS.md` へのシンボリックリンク（同一ファイル）。編集は実体の `AGENTS.md` に対して行う

## 6. データベースが必要な場合（Convex）

- DBが必要なアプリは Convex を使う。詳細手順は `docs/convex.md` を参照
- `CONVEX_TEAM_ACCESS_TOKEN` は環境変数として供給済み。`scripts/convex-provision.sh <app-name>` を実行すると、プロジェクト作成〜デプロイキー発行〜`.env.local` への書き込みまで完結する（チームIDの指定は不要）
- デプロイは `npx convex deploy --cmd 'vp run build' --cmd-url-env-var-name VITE_CONVEX_URL` → `wrangler deploy`

## 7. 認証（Googleログイン）が必要な場合（Clerk）

- 認証が必要なアプリは Clerk（共有開発インスタンス）を使う。詳細手順は `docs/auth.md`、参照実装は `apps/auth-demo`
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` は環境変数として供給済み。`scripts/convex-provision.sh` の後に `scripts/clerk-provision.sh <app-name>` を実行すると、許可オリジン追加〜issuer設定まで完結する
- 認証アプリはConvex前提（ユーザー識別は `ctx.auth.getUserIdentity()`）

## 8. 注意事項

- `wrangler login` は絶対に使わない（ヘッドレス環境のため認証できない）
- `process.env` をモジュールトップレベルで読まない（Workers環境の制約。`cloudflare:workers` の `env` を使うこと）
- `src/routeTree.gen.ts` は自動生成ファイルなので手で編集しない
- ビルドが通らない状態でデプロイ・コミットしない
- bindingsを変更した場合は `wrangler types`（`cf-typegen`）でEnv型を再生成する

## 9. 役割分担（モデルのオーケストレーション）

このリポジトリでの作業は、ユーザーが指示しなくても常に次の分担で進めること。
役割はモデル名ではなく「その役割に必要な能力のティア」で定義する。各サブエージェントの
使用モデルは `.claude/agents/`（実体は `.agents/agents/`）のフロントマター `model` フィールドが
**唯一の正**であり、モデルの世代交代・入れ替え時はそこだけを更新する（この章は書き換えない）。

- **メインモデル（あなた）= マネージャー**（セッションを動かしているモデル。その時点で使える最上位ティアを想定）
  - 要件整理・設計・詳細仕様書の作成
  - サブエージェントへのタスク割り当てと進行管理
  - `reviewer` の一次レビュー結果の採否判断・差し戻し指示・最終確認
  - 動作検証（ビルド確認・E2E）、デプロイ、コミット/プッシュ、URL報告
- **`reviewer` サブエージェント = レビュー担当**（マネージャーに次ぐ判断力を持つ重量級ティア）
  - `implementer` の成果物の一次コードレビュー（仕様適合・堅牢性・型安全性・リポジトリ規約）
  - 読み取り専用。コードの修正は行わない（修正は `implementer` に差し戻す）
  - 起動方法: Agent ツールで `subagent_type: reviewer` を指定する
- **`implementer` サブエージェント = 実装担当**（コスト効率の良い中量級ティア）
  - テンプレートのコピーなどのスキャフォールド作業
  - 仕様書に基づくコーディング、レビュー指摘の修正
  - その他、高度な判断を要しない細かい作業
  - 起動方法: Agent ツールで `subagent_type: implementer` を指定する
- **`researcher` サブエージェント = 調査担当**（軽量・高速ティア）
  - コードベースの探索、既存実装・ファイル構成の確認
  - ライブラリやAPIのドキュメント調査
  - 起動方法: Agent ツールで `subagent_type: researcher` を指定する

フロントマターではモデルを `opus` / `sonnet` / `haiku` のような**ティアのエイリアス**で指定して
いるため、同ティア内の世代交代（例: Sonnet 5 → 次世代Sonnet）は自動で追従され、書き換え不要。
呼び出し時に `model` パラメータを指定する必要はなく、指定し忘れてもメインモデルに
フォールバックすることはない。

運用ルール:
- 実装・調査・レビューを委任する時は必ず上記の `subagent_type` を指定する。汎用エージェント
  （`general-purpose` 等）を型指定なしで起動するとメインモデルを継承してしまうため、
  この用途では使わない
- マネージャー自身が実装コードを直接書くのは、1〜数行の軽微な修正のみ。それ以上は `implementer` に委任する
- 委任時は曖昧な指示ではなく、ファイル構成・型定義・ロジックまで書いた仕様書を渡す
- 仕様書には必ず堅牢性要件を含める（下記10章参照）
- `implementer` の成果物は `reviewer` の一次レビューを経ずにコミット・デプロイしない。
  blocking 指摘は `implementer` に差し戻して修正させ、マネージャーが最終確認する
  （マネージャーによる二重の詳細レビューは不要。採否判断と検証に集中する）
- **サブエージェントにさらにサブエージェントを起動させない**。委任の階層はマネージャー→担当の
  1段のみとし、依頼文に「再委任せず自分で Edit/Bash で完了させること」を明記する
  （実装エージェントが内部で再委任して途中停止し、進行が約10分空転した事故があった）
- 差し戻し・追加修正は新規エージェントを起動せず、同じエージェントに SendMessage で続きを依頼する
  （コンテキストを引き継げるため速い）。完了報告を受けたら鵜呑みにせず、対象ファイルを grep で実在確認する
- サブエージェントの「ツールが無いのでできませんでした」という報告を鵜呑みにしない。
  実際には使えることがある（実例: 「Playwrightが未導入なのでスクショ確認は省略した」と報告されたが
  グローバルに導入済みだった）。省略された検証はマネージャー自身がやり直す
- サブエージェントは中断されると通知が来ないまま消えることがある。
  待っても完了通知が来ない場合は `ListAgents` で生存を確認し、消えていたら投げ直す

## 10. 実装・検証の知見（過去のトラブルからのルール）

### ライブラリドキュメントの参照（Context7）
- リポジトリ直下の `.mcp.json` で Context7 MCP（最新ドキュメント取得）が使える
- ライブラリ（TanStack Start / Mantine / Convex / Clerk など）のAPIや設定方法を書くときは、
  記憶に頼らず Context7 で最新ドキュメントを確認してから仕様書作成・実装する
  （学習カットオフ後にAPIが変わっていることが多いため）
- `researcher` と `reviewer` はツールが制限されておりMCPツールを持たないため、
  Context7での確認はマネージャー自身か `implementer` が行う

### Mantine v9 の落とし穴
- `TextInput` などの `rightSection` に置いたボタンは、既定で `pointer-events: none` が効いて
  **表示はされるがクリックできない**。`rightSectionPointerEvents="all"` を明示すること
  （見た目だけの確認では気づけない。実際にクリックして検証する）
- `Badge` は既定で中身を大文字化する。日本語は影響ないが英字は `Convex` → `CONVEX` になる。
  元の表記を保ちたいときは `tt="none"`
- `AspectRatio` コンポーネントは無い。`<Box style={{ aspectRatio: '16 / 10' }}>` で作る

### 外部APIの扱い
- 外部APIのレスポンスのフィールドは **null・欠落がありうる前提** で実装する
  （例: Open-Meteo の `precipitation_probability_max` は日によって `null` を返す）。
  オプショナル型＋`?? フォールバック` で防御すること

### 動作検証の標準フロー（この順で行う。ブラウザ操作E2Eは既定ではやらない）

検証コストの9割は環境起因のブラウザ通信問題に消えるため、既定の検証は以下に限定する:

1. **ビルドゲート**: `vp run build`（vite build + tsc）
2. **バックエンド関数の直接テスト**（Convex利用時・必須）: `npx convex run <関数> '<JSON引数>'` で
   正常系・境界（営業時間端・定休日など）・エラー系（検証・競合）を数件ずつ確認する。数十秒で終わり、
   ロジック検証としてはブラウザE2Eより網羅的
3. **デプロイ後のSSR確認**: 本番URLに `curl` して全ルートの HTTPステータス と 主要文言 を確認する
   （デプロイ直後は一時的に404になることがある。数十秒おいて再試行してから調査する）
4. **見た目のスクリーンショット確認**: `vp dev` を起動し、ヘッドレスChromium（プロキシ設定なし）で
   `http://localhost:<port>` を撮影して目視確認する。SSR済みページなので外部通信の細工は不要
5. **本番URLをブラウザで開いての確認**（クライアント側の処理がある場合は必須）:
   `docs/e2e.md` の「全リクエストリレー」で本番URLを開いて撮影する。低コストなので惜しまず使う。
   **手順3の `curl` はSSRされたHTMLしか見ないため、マウント後に走る処理
   （サーバー関数の呼び出し、クライアントfetch）は一切検証できない。**
   ローカルの `vp dev` は実ネットワークに出られるので、本番でのみ壊れる不具合が素通りする
   （実例: Worker間の直接fetchが本番だけ `error code: 1042` で全滅していたのを、
   ローカル検証では緑表示のまま見逃した。下記「Cloudflare Workers の制約」参照）
6. **ブラウザでの操作E2E（クリック〜フォーム送信）は既定では行わない**。
   ユーザーが明示的に求めた場合や、クライアント側にしかないロジックが重要な場合のみ、
   `docs/e2e.md` の手順（WebSocketリレー）で行う

### Cloudflare Workers の制約（本番でしか出ない類のもの）
- **Workerから同一ゾーンの他の `*.workers.dev` への `fetch()` は失敗する。**
  `HTTP 404` ＋ ボディに `error code: 1042` が返る。Cloudflareが Worker間サブリクエストを
  許可していないため。**ローカルの `vp dev` は実ネットワークに出るので成功してしまい、
  本番デプロイ後にしか露見しない**
- 他のアプリを叩く必要がある場合は **Service Bindings** を使う。
  `wrangler.jsonc` の `services` に `{ "binding": "APP_XXX", "service": "<worker名>" }` を並べ、
  `import { env } from 'cloudflare:workers'` して `env.APP_XXX.fetch(new Request(url))` を呼ぶ。
  実装例は `apps/lab/src/server/liveness.ts` と `apps/lab/scripts/sync.mjs`（services を自動生成している）
- `services` に**存在しないWorkerを書くと `wrangler deploy` が失敗する**。
  未デプロイのものを混ぜないこと
- バインディングを足したら `wrangler types` で `worker-configuration.d.ts` を再生成し、
  `tsconfig.json` の `include` に加える（既定の `["src"]` では拾われず `tsc` が落ちる）
- 生成される `Env` 型には index signature が無いため `const r: Record<string, unknown> = env` は
  型エラーになる。バインディング名を動的に引くときは `Reflect.get(env, name)` を使う

### ブラウザ・プロキシの制約（ハマりどころ）
- **このサンドボックスの egress はヘッドレスChromiumの外部TLSを遮断する**（直接アクセスも
  プロキシ経由CONNECTも接続リセット。example.com ですら失敗する）。ブラウザから外部に出る検証は
  そのままでは不可能で、外部通信はすべてNode側にリレーする必要がある（詳細は `docs/e2e.md`）
- ただし `page.route('**/*')` で**全リクエストをNode側 `fetch` にリレー**すれば、
  本番URLのページを画像込みで開いて撮影できる（`docs/e2e.md` 前半）。
  `vp dev` を立てる必要がなく低コストなので、本番確認では積極的に使う
- ヘッドレスChromiumにプロキシを直接設定してはいけない
  （localhostへのページ読み込みまでプロキシに送られ405になる。bypass設定も効かない）
- 外部REST APIだけなら `page.route('https://api.example.com/**', ...)` でインターセプトして
  Node側の `fetch` にリレーする。Nodeスクリプトは
  `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node script.mjs` で実行する
- プロキシ関連のエラー（405/403/407やTLSエラー）が出たら、再試行する前に
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` と `/root/.ccr/README.md` を確認する

### 環境セットアップの注意
- `vp` はサンドボックスに未インストールのことがある。`command -v vp || npm i -g vite-plus` で導入する
  （`vp` 自体の導入だけは npm 直実行を許容する。アプリ操作は従来どおり `vp` 経由）

### プロセス管理
- `pkill -f "<文字列>"` は使わない（自分のシェルのコマンドラインにマッチして自滅する事故があった）
- 同じ理由で `pgrep -f ... | xargs kill` も禁止（同型の自滅事故が再発した）。
  ポートで特定する: `lsof -i :<port>` で PID を確認して `kill $PID`
- 開発サーバー等をバックグラウンド起動する時はPIDを控え、止める時は `kill $PID` を使う
- プロセスkillとデプロイ等の重要操作を1つの複合コマンドに連結しない
