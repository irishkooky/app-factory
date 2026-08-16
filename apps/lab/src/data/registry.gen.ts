// このファイルは scripts/sync.mjs が生成します。手で編集しないでください。

export type RegistryEntry = {
  /** apps/ 配下のディレクトリ名 */
  slug: string
  /** wrangler.jsonc の name（= workers.dev のサブドメイン） */
  workerName: string
  /** 公開URL */
  url: string
  /** Cloudflare 上に Worker が存在するか */
  deployed: boolean
  /** Worker の作成日時 ISO8601。未デプロイなら null */
  createdAt: string | null
  /** Worker の最終更新日時 ISO8601。未デプロイなら null */
  modifiedAt: string | null
  /** public/shots/<slug>.jpg が存在するか */
  hasShot: boolean
}

export const SUBDOMAIN = "ichigoooo"
export const GENERATED_AT = "2026-08-16T10:58:48.242Z"

export const REGISTRY: RegistryEntry[] = [
  {
    slug: "ai-era-skill-quiz",
    workerName: "ai-era-skill-quiz",
    url: "https://ai-era-skill-quiz.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-24T14:01:15.105215Z",
    modifiedAt: "2026-07-24T14:05:01.226059Z",
    hasShot: true,
  },
  {
    slug: "akachan-party",
    workerName: "akachan-party",
    url: "https://akachan-party.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-25T06:09:29.777133Z",
    modifiedAt: "2026-07-25T06:09:36.31515Z",
    hasShot: true,
  },
  {
    slug: "auth-demo",
    workerName: "auth-demo",
    url: "https://auth-demo.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-12T03:31:54.960475Z",
    modifiedAt: "2026-07-12T03:32:00.086062Z",
    hasShot: true,
  },
  {
    slug: "cash-forecast",
    workerName: "cash-forecast",
    url: "https://cash-forecast.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-12T05:07:30.309258Z",
    modifiedAt: "2026-07-14T08:05:36.44292Z",
    hasShot: true,
  },
  {
    slug: "convex-showcase",
    workerName: "convex-showcase",
    url: "https://convex-showcase.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-08-08T02:38:42.945051Z",
    modifiedAt: "2026-08-08T03:23:59.778324Z",
    hasShot: true,
  },
  {
    slug: "guestbook",
    workerName: "guestbook",
    url: "https://guestbook.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-11T03:10:10.956714Z",
    modifiedAt: "2026-07-11T03:10:16.767732Z",
    hasShot: true,
  },
  {
    slug: "hello",
    workerName: "hello",
    url: "https://hello.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-05T14:22:36.664695Z",
    modifiedAt: "2026-07-05T14:22:44.231362Z",
    hasShot: false,
  },
  {
    slug: "lab",
    workerName: "lab",
    url: "https://lab.ichigoooo.workers.dev",
    deployed: false,
    createdAt: null,
    modifiedAt: null,
    hasShot: false,
  },
  {
    slug: "loop-engineering-demo",
    workerName: "loop-engineering-demo",
    url: "https://loop-engineering-demo.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-05T15:39:32.812995Z",
    modifiedAt: "2026-07-05T15:39:37.923098Z",
    hasShot: true,
  },
  {
    slug: "loxonin-reminder",
    workerName: "loxonin-reminder",
    url: "https://loxonin-reminder.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-18T07:22:03.494897Z",
    modifiedAt: "2026-07-18T07:47:05.736223Z",
    hasShot: true,
  },
  {
    slug: "pitch-battle",
    workerName: "pitch-battle",
    url: "https://pitch-battle.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-24T13:11:26.797762Z",
    modifiedAt: "2026-07-24T13:11:32.880189Z",
    hasShot: true,
  },
  {
    slug: "pitch-roulette",
    workerName: "pitch-roulette",
    url: "https://pitch-roulette.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-24T13:14:06.798808Z",
    modifiedAt: "2026-07-24T13:14:12.581633Z",
    hasShot: true,
  },
  {
    slug: "salon-booking",
    workerName: "salon-booking",
    url: "https://salon-booking.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-17T08:13:57.558655Z",
    modifiedAt: "2026-07-17T08:42:12.681805Z",
    hasShot: true,
  },
  {
    slug: "token-cost-checker",
    workerName: "token-cost-checker",
    url: "https://token-cost-checker.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-21T23:50:41.958701Z",
    modifiedAt: "2026-07-21T23:50:49.233767Z",
    hasShot: true,
  },
  {
    slug: "token-cost-checker-b",
    workerName: "token-cost-checker-b",
    url: "https://token-cost-checker-b.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-22T04:28:22.629498Z",
    modifiedAt: "2026-07-22T04:28:29.011789Z",
    hasShot: true,
  },
  {
    slug: "token-cost-checker-fable-only",
    workerName: "token-cost-checker-fable-only",
    url: "https://token-cost-checker-fable-only.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-22T05:18:11.439916Z",
    modifiedAt: "2026-07-22T05:18:17.512173Z",
    hasShot: true,
  },
  {
    slug: "token-cost-checker-fable-orchestration",
    workerName: "token-cost-checker-fable-orchestration",
    url: "https://token-cost-checker-fable-orchestration.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-22T05:31:35.945796Z",
    modifiedAt: "2026-07-22T05:31:42.324Z",
    hasShot: true,
  },
  {
    slug: "token-cost-checker-sonnet-only",
    workerName: "token-cost-checker-sonnet-only",
    url: "https://token-cost-checker-sonnet-only.ichigoooo.workers.dev",
    deployed: false,
    createdAt: null,
    modifiedAt: null,
    hasShot: false,
  },
  {
    slug: "tokyo-outfit",
    workerName: "tokyo-outfit",
    url: "https://tokyo-outfit.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-07-05T14:48:56.863724Z",
    modifiedAt: "2026-07-06T00:36:33.216862Z",
    hasShot: true,
  },
  {
    slug: "turing-werewolf",
    workerName: "turing-werewolf",
    url: "https://turing-werewolf.ichigoooo.workers.dev",
    deployed: true,
    createdAt: "2026-08-08T03:06:58.447567Z",
    modifiedAt: "2026-08-08T08:47:09.785524Z",
    hasShot: true,
  },
]
