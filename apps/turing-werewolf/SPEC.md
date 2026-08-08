# チューリング人狼 — 実装仕様書

対象ディレクトリ: `apps/turing-werewolf`（スキャフォールド済み・依存インストール済み・Convexプロビジョニング済み）。
この仕様書は実装完了後に削除するので、リポジトリ規約との整合は気にしなくてよい。

## 0. ゲーム概要

参加者 N 人 + AI が1席混ざった「N+1席」のチャットゲーム。お題に全員が回答し、
全員分が揃ったら一斉公開。最後に「どの席がAIか」を投票して当てる。

- 各プレイヤーは自分の席（仮名）だけを知っている。誰がAIかを知っているのはサーバー（Convex）だけ
- **「自分の役職を問い合わせる関数」は存在しない**。秘密は「認証で守る」のではなく「返す関数を作らない」ことで守る
- ログイン不要。端末ごとに `crypto.randomUUID()` を `localStorage` に保存し、ミューテーション引数で渡す

### 進行フェーズ

| フェーズ | 内容 |
|---|---|
| `lobby` | 4桁ルームコードで入室。参加者が増えていく |
| `answering` | お題に全員(+AI)が回答。**全員出すまで本文は誰にも見えない** |
| `reveal` | 全員分を一斉表示 |
| （answering→reveal を `totalRounds` 回繰り返す） | |
| `discussion` | 自由会話（拡張2で実装。MVPでは飛ばす） |
| `voting` | 「AI席だと思う席」に1票。**全員入れるまで見えない** |
| `result` | AI席の正体と得票を開示 |

勝敗: AI席が最多得票（同率首位含む）なら人間側の勝ち、それ以外はAI側の勝ち。個人スコアなし。

## 1. 今回のスコープ（MVP）

- ロビー（作成/入室/参加者一覧/ホストの開始ボタン）
- ラウンドループ（answering→reveal、ホストの「次へ」で進行）。**ループは汎用実装だが `totalRounds = 1` で開始**
- 投票→結果
- AI回答1本（後述のリレー経由、失敗時フォールバック）
- レスポンシブ最低限（スマホで入力欄がキーボードに隠れないこと）
- **やらない（後続タスク）**: 時間切れ(`forceAdvance`のスケジュール予約)、discussionフェーズ、観戦モード、AI割り込み
  - ただし `deadlineAt` フィールド、`messages` テーブル、`discussion` フェーズ値など**スキーマと型は最初から全部定義する**

## 2. スキーマ（`convex/schema.ts`）— このまま実装する

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),                       // 4桁の数字
    phase: v.union(
      v.literal("lobby"), v.literal("answering"), v.literal("reveal"),
      v.literal("discussion"), v.literal("voting"), v.literal("result"),
    ),
    roundIndex: v.number(),                 // 0 始まり
    totalRounds: v.number(),                // MVPでは 1 で作成
    promptText: v.optional(v.string()),     // 現ラウンドのお題
    deadlineAt: v.optional(v.number()),     // ms epoch（MVPでは未使用のままでよい）
  }).index("by_code", ["code"]),

  seats: defineTable({
    roomId: v.id("rooms"),
    alias: v.string(),
    order: v.number(),                      // 表示順。startGameで必ずシャッフルして振り直す
  }).index("by_room", ["roomId"]),

  // ❌ 公開クエリから返してはならない
  roomSecrets: defineTable({
    roomId: v.id("rooms"),
    aiSeatId: v.id("seats"),
  }).index("by_room", ["roomId"]),

  // ❌ 公開クエリから返してはならない（getMySeat の自席返却のみ例外）
  seatOwners: defineTable({
    roomId: v.id("rooms"),
    seatId: v.id("seats"),
    deviceId: v.string(),
    isHost: v.boolean(),
  })
    .index("by_room_device", ["roomId", "deviceId"])
    .index("by_seat", ["seatId"]),

  answers: defineTable({
    roomId: v.id("rooms"),
    roundIndex: v.number(),
    seatId: v.id("seats"),
    text: v.string(),
  }).index("by_room_round", ["roomId", "roundIndex"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    seatId: v.id("seats"),
    text: v.string(),
  }).index("by_room", ["roomId"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    voterSeatId: v.id("seats"),
    targetSeatId: v.id("seats"),
  })
    .index("by_room", ["roomId"])
    .index("by_room_voter", ["roomId", "voterSeatId"]),
});
```

設計意図（守ること）:
- **秘密はフィールドではなくテーブルで分ける。** `seats` に deviceId を置くと「欄が空の席=AI」と即バレするので `seatOwners` に隔離
- ホスト判定は `seatOwners.isHost`（`order` はシャッフルされるので order=0 をホスト扱いにしない）

## 3. セキュリティ上の絶対ルール（レビューで最初に見られる項目）

1. **公開クエリの返り値は毎回手で組み立てる。** `return await ctx.db.get(id)`・`...doc`・`.collect()` の生返しは禁止
2. **`listSeats` は `{ seatId, alias, order }` のみ返す。`_creationTime` を絶対に含めない**
   （AI席は startGame 中に作られるため作成時刻が必ず最後。生で返すとDevToolsで一発でバレる）
3. `startGame` で**AI席を含む全席の `order` をシャッフルして振り直す**（Fisher–Yates）。表示は常に `order` 昇順
4. `roomSecrets` を読む公開関数は `getResult` のみ。`getResult` は `phase === "result"` 以外では `null` を返す
5. `answers` / `votes` のフェーズゲートは**クエリ側**で行う（UIで隠すのは隠したことにならない）
6. `seatOwners` を返す公開関数は `getMySeat`（自分の deviceId で引いた自席）のみ

## 4. サーバー関数

ファイル分割: `convex/rooms.ts`（部屋・席） / `convex/game.ts`（進行・回答・投票） / `convex/ai.ts`（AI） / `convex/prompts.ts`（定数）。

### 公開クエリ

| 関数 | 返すもの |
|---|---|
| `rooms.getRoom({ code })` | `{ _id, phase, roundIndex, totalRounds, promptText, deadlineAt }` or `null` |
| `rooms.listSeats({ roomId })` | `[{ seatId, alias, order }]` を `order` 昇順 |
| `rooms.getMySeat({ roomId, deviceId })` | `{ seatId, alias, isHost }` or `null` |
| `game.listAnswers({ roomId, roundIndex })` | フェーズゲート: `answering` 中は `{ phase: "hidden", submittedSeatIds: [...] }`。`reveal` 以降（reveal/discussion/voting/result、または過去ラウンド）は `{ phase: "open", answers: [{ seatId, text }] }` |
| `game.getVoteStatus({ roomId })` | `voting` 中は `{ votedCount, totalSeats, votedSeatIds }`（votedSeatIds は「投票済みの席」表示用。誰に入れたかは含めない）。`result` では全票 `[{ voterSeatId, targetSeatId }]` も含める。それ以外のフェーズは `{ votedCount: 0, totalSeats, votedSeatIds: [] }` でよい |
| `game.getResult({ roomId })` | `phase === "result"` のときだけ `{ aiSeatId, tally: [{ seatId, count }], humansWin: boolean }`。それ以外は `null` |

※ `listAnswers` の「過去ラウンド」（`roundIndex < room.roundIndex`）は常に open。現在ラウンドは phase で判定。

### ミューテーション

すべて引数の `deviceId` から `seatOwners`（`by_room_device`）で自席を解決する。席がなければ throw（`joinRoom` 以外）。

| 関数 | 処理 |
|---|---|
| `rooms.createRoom({ deviceId })` | 4桁コード（1000–9999）を `by_code` で重複チェックしつつ生成（衝突したら再抽選、最大20回）。`rooms` を `lobby`/`roundIndex:0`/`totalRounds:1` で作成。作成者の席（仮名割り当て・order 0）と `seatOwners`（isHost: true）を作る。返り値 `{ roomId, code }` |
| `rooms.joinRoom({ code, deviceId })` | 部屋がなければ throw。既に `seatOwners` にあれば既存席を返す（**リロード復帰**）。`lobby` 以外のフェーズでの新規参加は throw（"ゲームは開始済みです"）。席上限8。仮名は部屋内で未使用のものを割り当て。返り値 `{ roomId, seatId }` |
| `game.startGame({ roomId, deviceId })` | isHost のみ・`lobby` のみ・人間2席以上必須。**AI席を1つ作成**し `roomSecrets` に `aiSeatId` を保存。**全席の order をシャッフルして振り直す**。難易度1のお題を選び `phase:"answering"`, `promptText`, `deadlineAt: Date.now()+60_000` を設定。`ctx.scheduler.runAfter(8_000 + Math.floor(Math.random()*25_000), internal.ai.generateAnswer, { roomId, roundIndex: 0 })` を予約（時間切れ用スケジューラはMVPでは予約しない） |
| `game.submitAnswer({ roomId, deviceId, text })` | `answering` 中のみ。text は trim して 1〜120字。1ラウンド1回（既に自席の回答があれば throw）。**保存後、同一ミューテーション内で「全席数 == 現ラウンドの回答数」を判定し、揃っていれば `phase:"reveal"` に更新** |
| `game.nextRound({ roomId, deviceId })` | isHost のみ・`reveal` 中のみ。`roundIndex+1 < totalRounds` なら次ラウンド（roundIndex++、次難易度のお題、`phase:"answering"`、AI回答スケジュール予約）。最終ラウンドなら `phase:"voting"`（MVPでは discussion を飛ばす。deadlineAt は Date.now()+45_000 をセットするだけでよい） |
| `game.castVote({ roomId, deviceId, targetSeatId })` | `voting` 中のみ。targetSeatId が同じ部屋の席であること・**自席への投票は禁止**。1人1票・上書き可（`by_room_voter` で既存票を patch）。**AI席は投票しない**ので「人間席数（= seatOwners の数）== 票数」が揃ったら同一ミューテーション内で `phase:"result"` |
| `game.sendMessage({ roomId, deviceId, text })` | `discussion` 中のみ（実装はするがMVPのUIからは使わない）。text 1〜200字 |

**`submitAnswer` / `castVote` の「最後の1人」判定はミューテーション内で行う**（Convexのミューテーションは直列化されるので競合してもフェーズ遷移は1回しか起きない）。

### 内部関数（`convex/ai.ts`）

| 関数 | 種別 | 処理 |
|---|---|---|
| `internal.ai.generateAnswer({ roomId, roundIndex })` | `internalAction` | 下記「AI発話設計」のとおり生成し、`internal.ai.saveAiAnswer` で保存 |
| `internal.ai.saveAiAnswer({ roomId, roundIndex, text })` | `internalMutation` | 部屋が `answering` かつ `roundIndex` 一致でなければ黙って return（**冪等**）。`roomSecrets` から aiSeatId を引き、既にAIの回答があれば return。保存後に submitAnswer と同じ「全員揃ったか」判定を通す（判定ロジックはヘルパー関数で共通化する） |
| `internal.ai.getAiContext({ roomId, roundIndex })` | `internalQuery` | generateAnswer が必要とする情報（phase、promptText、全席の alias、AI席の alias、過去〜現在ラウンドの全回答（alias つき）、人間の回答スタイル統計用の生テキスト）をまとめて返す |

### AI発話設計（`generateAnswer` の中身）

生成経路: **Convexアクション → 自アプリWorkerの `/api/generate` へ fetch → Workers AI (llama-3.3-70b)**。
エンドポイントと秘密は Convex 環境変数に設定済み。アクションのハンドラ内で
`process.env.AI_ENDPOINT` / `process.env.AI_ROUTE_SECRET` を読む（未設定なら即フォールバック）。

```
POST {AI_ENDPOINT}
Headers: { "x-ai-secret": AI_ROUTE_SECRET, "Content-Type": "application/json" }
Body: { "system": "...", "prompt": "..." }
→ 200: { "text": "..." } / それ以外: エラー
```

`/api/generate` は `src/routes/api/generate.ts` に実装済み（変更不要）。

プロンプトに入れるもの:
- 現在のお題
- これまでの全ラウンドの全回答（仮名つき）— 文体を合わせるため
- 自分の仮名
- 他の参加者の回答の平均文字数（「◯文字前後で」と指示に使う）

指示（system プロンプトに明記）:
- 日本語で40文字以内、1文だけ。回答本文のみを出力（前置き・引用符・説明禁止）
- 他の参加者の文体・長さに寄せる（敬語率、句点の有無、絵文字の有無）
- 具体を1つだけ。ただし検証されない粒度（店名NG、「駅前のコンビニ」程度はOK）
- 完璧に書かない。言い切らない、少し雑でよい

禁止リスト（system プロンプトに明記。AIがバレる原因のほぼ全部）:
- 両論併記（「〜な面もありますが」）/ 一般論・教科書的説明
- 「〜ですね!」「なるほど」等の相槌の型 / 丁寧すぎる敬語
- 40字超 / 3つ以上の列挙 / 絵文字（他の参加者が使っていなければ0個）
- 「AIとして」「私は」で始める

後処理: 前後の引用符・改行・「回答:」等のラベルを剥がし、40字を超えたら「。」等の文末で切り詰め、
それでも超えるなら40字で切る。空になったらフォールバックへ。

**フォールバック（必須）**: fetch 失敗・非200・タイムアウト（15秒、AbortController）・空文字のとき、
お題ごとに用意した無難な短文2〜3個（`prompts.ts` に定義）からランダムに選んで保存する。
**どんな失敗でも必ず何かを保存し、ゲームを止めない**（無言はAI席の即バレ = ゲーム崩壊）。

### お題とフォールバック（`convex/prompts.ts`）

定数配列で持つ（DBに入れない）。形:

```ts
export type PromptDef = { text: string; fallbacks: string[] };
export const PROMPTS: PromptDef[][] = [ /* [難易度1の配列, 難易度2の配列, 難易度3の配列] */ ];
export function pickPrompt(roundIndex: number): PromptDef { /* 難易度 = min(roundIndex, 2) からランダム */ }
```

難易度1（易・人間有利）: 「今日ここに来る途中で見たものを1つ」「昨日の夜ごはんはなんだった？」「いまカバンに入ってる一番いらないもの」
難易度2（中）: 「直近1週間で一番イラッとしたこと」「最後に声に出して笑ったのはいつ、なんで？」
難易度3（難・AI有利）: 「好きなプログラミング言語と、その理由」「AIに仕事を任せていて一番ムカつく瞬間」

各お題に自然なフォールバック回答を2〜3個書くこと（例: 夜ごはん→「カレー。二日目のやつ」）。

### 仮名（`convex/prompts.ts` に定数で）

「色/形容 + 動物」のひらがな仮名を20個以上定義（例: あかいきつね、みどりのたぬき、しろいふくろう、
あおいねこ、きいろいとかげ、くろいうさぎ、はいいろのふくろう…）。部屋内で未使用のものからランダムに割り当て。

## 5. フロントエンド

TanStack Start + React 19 + **Mantine v9**（テーマは既存 `src/theme.ts` を流用）。
Convex接続は `docs/convex.md` セクション4の `router.tsx` パターンをそのまま使う
（`ConvexQueryClient` + `setupRouterSsrQueryIntegration` + `ConvexProvider`）。
参考実装: `apps/guestbook` / `apps/convex-showcase`（router.tsx・useSuspenseQuery+convexQuery の使い方）。

**リアルタイム反映が命のアプリ**なので、部屋画面のクエリ購読は `useQuery(convexQuery(...))` /
`useSuspenseQuery(convexQuery(...))`（react-query経由。Convexが自動で購読・プッシュ更新する）。

### deviceId（`src/lib/deviceId.ts`）

```ts
export function getDeviceId(): string  // localStorage("tw-device-id") になければ crypto.randomUUID() を保存
```

SSRで実行しないこと（`typeof window` ガード + クライアント側でのみ使用。
ルートコンポーネントでは useState 初期化子や useEffect で取得する）。

### ルート構成

- `src/routes/index.tsx` — トップ。タイトル・ゲーム説明（3行程度）・「部屋を作る」ボタン・
  ルームコード4桁入力+「入室」。作成/入室成功で `/room/$code` へ navigate
- `src/routes/room.$code.tsx` — 部屋画面。`getRoom` で部屋を購読し、`phase` で表示を切り替える
  （1ルートの中でフェーズ別コンポーネントを出し分け。フェーズごとに別ルートにしない）

### 部屋画面のフェーズ別UI

共通ヘッダ: ルームコード、自分の仮名（「あなた: あかいきつね」）、フェーズ表示。

- `lobby`: ルームコードを大きく表示（コピーボタン付き）。参加者の仮名一覧（リアルタイムで増える）。
  ホストにだけ「ゲーム開始」ボタン（2人未満なら disabled + 理由表示）。非ホストには「ホストの開始を待っています」
- `answering`: お題を大きく表示。自分の回答入力欄（Textarea + 送信ボタン、送信済みなら「送信済み」表示に変わる）。
  「◯/◯人が回答済み」バッジと、席ごとの提出済みチェック表示（`submittedSeatIds` を使う。本文は見えない）
- `reveal`: 全席の回答をカードで一斉表示（`order` 昇順、仮名つき）。ホストにだけ「次へ」ボタン
  （次ラウンド or 投票へ）。非ホスト向けには「ホストの操作待ち」
- `voting`: 席一覧（自席以外）から1つ選んで投票。選択中ハイライト、投票後も変更可。
  「◯/◯人が投票済み」表示。過去ラウンドの回答も見返せるようにする（Accordion等で全ラウンドの回答を表示）
- `result`: AI席をドラマチックに開示（「AIは あおいねこ でした」）、得票数一覧、
  「人間側の勝ち！/AIの勝ち！」バナー。「トップへ戻る」リンク

エラーハンドリング: ミューテーション失敗（部屋なし・開始済み等）は Mantine の通知 or インラインの
Alert で表示し、画面を壊さない。部屋が存在しないコードなら「部屋が見つかりません」表示。

### レスポンシブ（MVP必須分のみ）

- スマホ幅（375px）で崩れないこと。Container size="sm" ベースでよい
- 入力欄がソフトウェアキーボードで隠れないこと（answering の入力欄はページ上部寄りに置く。
  100vh 固定レイアウトにしない）

## 6. リポジトリ規約（抜粋・遵守）

- パッケージ操作・ビルドは必ず `vp`（`vp add` / `vp run build`）。npm/pnpm 直接実行禁止
- `src/routeTree.gen.ts` は自動生成。手で編集しない（`vp run build` か `vite dev` が再生成する）
- `process.env` をモジュールトップレベルで読まない（Convexアクションのハンドラ内はOK）
- Convex の `_generated` はコミット対象。`npx convex codegen` で生成できる
- ライブラリAPIに不安がある箇所は Context7 MCP で最新ドキュメントを確認してよい
  （ただしまず `apps/guestbook` / `apps/convex-showcase` / `apps/tokyo-outfit` の実例を読むこと）

## 7. 完了条件

1. `vp run build`（vite build + tsc --noEmit）が通る
2. `npx convex codegen` 済みで `convex/_generated` が最新
3. 上記スキーマ・関数・UIがすべて実装されている
4. セキュリティ絶対ルール（3章）を満たしている
