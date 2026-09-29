import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation } from './_generated/server'

const KINDS = ['要望', '不具合', '導入・開発の相談', 'その他']
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}

/** 公開フォームからの送信。認証なしで呼ばれるので中身をここで検証する */
export const submit = mutation({
  args: {
    kind: v.string(),
    message: v.string(),
    name: v.string(),
    company: v.string(),
    email: v.string(),
    platform: v.string(),
    userAgent: v.string(),
    scanCount: v.number(),
    /** ボット避け。人間には見えない欄なので、埋まっていたら黙って捨てる */
    website: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.website.trim() !== '') return null
    const message = clip(args.message, 2000)
    if (message.length < 2) throw new Error('内容を入力してください')
    const email = clip(args.email, 200)
    if (email && !EMAIL_PATTERN.test(email)) throw new Error('メールアドレスの形式を確認してください')
    return await ctx.db.insert('inquiries', {
      kind: KINDS.includes(args.kind) ? args.kind : 'その他',
      message,
      name: clip(args.name, 100),
      company: clip(args.company, 100),
      email,
      platform: clip(args.platform, 20),
      userAgent: clip(args.userAgent, 300),
      scanCount: Math.max(0, Math.min(10_000, Math.floor(args.scanCount))),
    })
  },
})

/** 管理用。公開しない（npx convex run inquiries:list で読む） */
export const list = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query('inquiries').order('desc').collect(),
})

/** 管理用。テスト送信やスパムを消す（npx convex run inquiries:remove '{"id":"..."}'） */
export const remove = internalMutation({
  args: { id: v.id('inquiries') },
  handler: (ctx, { id }) => ctx.db.delete(id),
})
