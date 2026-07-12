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
7. `git commit` して `push` する
8. PRを作成し、マージまで行う（下記「PRとマージの運用」参照）
9. **最後に必ずデプロイURL（`https://<name>.<account>.workers.dev`）とマージ結果を報告して終了する**

## 5. 既存アプリの修正

1. `apps/<name>` で作業する
2. `vp run build`
3. `wrangler deploy`
4. `commit` & `push`
5. PRを作成し、マージまで行う（下記「PRとマージの運用」参照）
6. URLとマージ結果を報告する

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

## 10. 実装・検証の知見（過去のトラブルからのルール）

### ライブラリドキュメントの参照（Context7）
- リポジトリ直下の `.mcp.json` で Context7 MCP（最新ドキュメント取得）が使える
- ライブラリ（TanStack Start / Mantine / Convex / Clerk など）のAPIや設定方法を書くときは、
  記憶に頼らず Context7 で最新ドキュメントを確認してから仕様書作成・実装する
  （学習カットオフ後にAPIが変わっていることが多いため）
- `researcher` と `reviewer` はツールが制限されておりMCPツールを持たないため、
  Context7での確認はマネージャー自身か `implementer` が行う

### 外部APIの扱い
- 外部APIのレスポンスのフィールドは **null・欠落がありうる前提** で実装する
  （例: Open-Meteo の `precipitation_probability_max` は日によって `null` を返す）。
  オプショナル型＋`?? フォールバック` で防御すること

### ブラウザE2E検証（Playwright）
- このサンドボックスの外部通信はエージェント用プロキシ経由が必須だが、
  **ヘッドレスChromiumにプロキシを直接設定してはいけない**
  （localhostへのページ読み込みまでプロキシに送られ405になる。bypass設定も効かない）
- 正解: ブラウザはプロキシなしで起動し、外部APIへのリクエストだけ
  `page.route('https://api.example.com/**', ...)` でインターセプトして
  Node側の `fetch` にリレーする。Nodeスクリプトは
  `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node script.mjs` で実行する
- プロキシ関連のエラー（405/403/407やTLSエラー）が出たら、再試行する前に
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` と `/root/.ccr/README.md` を確認する

### プロセス管理
- `pkill -f "<文字列>"` は使わない（自分のシェルのコマンドラインにマッチして自滅する事故があった）
- 開発サーバー等をバックグラウンド起動する時はPIDを控え、止める時は `kill $PID` を使う
- プロセスkillとデプロイ等の重要操作を1つの複合コマンドに連結しない
