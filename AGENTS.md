# app-factory

## 1. このリポジトリについて

小さな Web アプリを大量生産するためのモノレポ。

- `apps/` 配下の1フォルダ = 1アプリ = 1つの Cloudflare Worker = 1つの URL（`https://<name>.ichigoooo.workers.dev`）
- 各アプリは独立してビルド・デプロイする。他のアプリに依存させない
- `apps/hello` は新規アプリの雛形
- `apps/lab` は全アプリの一覧ポータル（https://lab.ichigoooo.workers.dev）
- 作業の進め方は Cursor の pstack プラグイン（`/poteto-mode`）を主軸にする。
  このファイルは「常に正しい事実」と「pstack の既定をこのリポジトリで上書きする規則」だけを持つ。
  手順は `.agents/skills/` のスキルにある
- `CLAUDE.md` は `AGENTS.md` へのシンボリックリンク、`.claude` は `.agents` へのシンボリックリンク。
  編集は実体の `AGENTS.md` と `.agents/` に対して行う

## 2. 技術スタック（固定・変更禁止）

- **フレームワーク**: TanStack Start（React 19）
- **UI**: Mantine v9 のみ。テーマは雛形の `src/theme.ts` を流用する
- **コマンド体系**: Vite+（`vp`）
- **デプロイ先**: Cloudflare Workers
- **DB / 認証 / 課金**: Convex / Clerk（共有開発インスタンス）/ Stripe（テストモード）
- **パッケージマネージャ**: pnpm。ただし直接叩かず、必ず `vp` 経由で操作する。`npm` / `pnpm` の直接実行は禁止
  （例外は `vp` 自体の導入のみ: `command -v vp || npm i -g vite-plus`）

理由なく変更・置換しない。

## 3. コマンド規約

| 目的 | コマンド |
|---|---|
| 依存関係インストール | `vp install` |
| 開発サーバー起動 | `vp dev` |
| ビルド検証 | 各アプリのディレクトリで `vp run build`（vite build + tsc） |
| テスト | `vp test` |
| 静的チェック | `vp check` |
| 依存追加 | `vp add <pkg>`（開発依存は `vp add -D <pkg>`） |

## 4. 作業の入口

rigor が要る作業は `/poteto-mode` で始める。playbook の選択は pstack に任せる。
このリポジトリ固有の手順は次のスキルにあり、playbook の手順の中で使う。

| スキル | 使う場面 |
|---|---|
| `new-app` | 新しいアプリを `apps/` に足す |
| `ship-app` | ビルド、デプロイ、ポータル更新、PR、マージ、URL 報告 |
| `verify-app` | 完了とする前の動作検証。pstack の Prove It Works はこれで満たす |
| `convex-app` | DB が要る |
| `clerk-auth` | Googleログインが要る |
| `stripe-billing` | サブスク課金が要る |

役割ごとのモデルは `.cursor/rules/pstack-models.mdc`（全役割 `auto`）が決める。
このリポジトリ独自のサブエージェントは置かない。委任は `poteto-mode` の Subagents 節に従う。

## 5. pstack の既定をこのリポジトリで上書きする規則

pstack の指示とこの節が食い違ったら、この節を優先する。

1. **デプロイで止まらない。** `wrangler deploy`、`npx convex deploy`、`vp run release`（apps/lab）は
   このリポジトリでは日常の可逆な操作として扱い、確認を取らずに実行する。条件は `vp run build` が通っていること。
   Worker の削除、Convex プロジェクトやデータの削除、Stripe の本番モード化、共有ブランチへの force push は従来どおり止まって確認する
2. **PR とマージ。** PR は ready で作る（`draft: false`）。PR の本文は日本語で書く。
   セクション構成（Why / Scope / Tradeoffs / Blast Radius / Verification）は pstack の Opening a PR に従い、
   見出しは「背景 / 変更範囲 / 検討した代替案 / 影響範囲 / 検証」とする
   - 変更が `apps/` 配下だけなら squash merge まで行い、リモートブランチを消す。
     デプロイがマージより先に来るので、マージは main を本番の写しに保つ作業。未マージで終えない
   - `apps/` 以外（`AGENTS.md`、`.agents/`、`.cursor/`、`apps/hello`、`scripts/`、`packages/`、ルートの設定）に
     触れたら PR の作成で止め、ユーザーの確認を待つ。明示の指示があればマージしてよい
3. **PR の粒度。** 1アプリの変更は1つの PR にまとめる。スタックにはしない。
   共有部分とアプリの変更が混ざったら、共有部分だけ別の PR に分ける
4. **完了報告。** アプリを出荷したら、最後の返答にデプロイ URL とマージ結果を必ず書く
5. **worktree は任意。** Cloud Agent では渡されたブランチでそのまま作業する
6. **同梱されていないスキル。** `/deslop`、`control-ui`、`control-cli`（`cursor-team-kit`）が無ければ
   `skip: cursor-team-kit 未導入` として TODO に残す。UI の検証は `verify-app` で代える
7. **秘密情報が無い環境。** `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `CONVEX_TEAM_ACCESS_TOKEN` /
   `CLERK_*` / `STRIPE_SECRET_KEY` が無ければデプロイやプロビジョニングはできない。
   回避策を作らず、足りない変数名を挙げてユーザーに Secrets への追加を頼む
8. **ライブラリの API。** TanStack Start / Mantine / Convex / Clerk などの API を書く前に、
   Context7 MCP（`.mcp.json`）で最新ドキュメントを確認する。記憶で書かない

## 6. 常に守る不変条件

どれも破ると本番でだけ、または静かに壊れる。

### 生成物と環境

- `wrangler login` は使わない（ヘッドレス環境では認証できない）
- `process.env` をモジュールのトップレベルで読まない。`cloudflare:workers` の `env` を使う
- `src/routeTree.gen.ts` と apps/lab の生成物（`registry.gen.ts`、`wrangler.jsonc`、`public/shots/*.jpg`、`worker-configuration.d.ts`）は手で編集しない
- ビルドが通らない状態でデプロイ・コミットしない
- bindings を変えたら `wrangler types` で `worker-configuration.d.ts` を作り直し、`tsconfig.json` の `include` に加える
  （既定の `["src"]` では拾われず `tsc` が落ちる）

### Cloudflare Workers

- Worker から同じゾーンの別の `*.workers.dev` への `fetch()` は `HTTP 404` とボディ `error code: 1042` で失敗する。
  ローカルの `vp dev` では成功するので本番でしか見つからない。他のアプリは Service Bindings で呼ぶ。
  `wrangler.jsonc` の `services` に `{ "binding": "APP_XXX", "service": "<worker名>" }` を書き、
  `import { env } from 'cloudflare:workers'` して `env.APP_XXX.fetch(new Request(url))`。
  実装例は `apps/lab/src/server/liveness.ts` と `apps/lab/scripts/sync.mjs`
- `services` に存在しない Worker を書くと `wrangler deploy` が失敗する
- 生成される `Env` 型には index signature が無い。バインディング名を動的に引くときは `Reflect.get(env, name)`

### Mantine v9

- `TextInput` などの `rightSection` のボタンは既定で `pointer-events: none` になり、見えるのに押せない。
  `rightSectionPointerEvents="all"` を付ける。見た目では気づけないので実際に押して確かめる
- `Badge` は中身を大文字化する。英字の表記を保つなら `tt="none"`
- `AspectRatio` は無い。`<Box style={{ aspectRatio: '16 / 10' }}>` で作る

### 外部 API

- レスポンスのフィールドは null や欠落がありうる前提で書く。オプショナル型と `??` で守る
  （例: Open-Meteo の `precipitation_probability_max` は日によって `null`）

### プロセス管理

- `pkill -f` と `pgrep -f ... | xargs kill` は使わない。自分のシェルのコマンドラインに一致して自滅する。
  `lsof -i :<port>` で PID を引いて `kill $PID`
- 裏で起動したプロセスは PID を控える
- プロセスの kill とデプロイなどの重要な操作を1つの複合コマンドに連結しない
