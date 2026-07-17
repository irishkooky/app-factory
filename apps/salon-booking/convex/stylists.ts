import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { AVATAR_COLORS } from './lib'

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const stylists = await ctx.db.query('stylists').collect()
    return stylists.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const stylists = await ctx.db.query('stylists').collect()
    return stylists.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

function validateStylistFields(args: {
  name: string
  role: string
  bio: string
  avatarColor: string
}) {
  const name = args.name.trim()
  if (name.length < 1 || name.length > 30) {
    throw new ConvexError('名前は1〜30文字で入力してください。')
  }
  const role = args.role.trim()
  if (role.length > 50) {
    throw new ConvexError('役職は50文字以内で入力してください。')
  }
  const bio = args.bio.trim()
  if (bio.length > 200) {
    throw new ConvexError('紹介文は200文字以内で入力してください。')
  }
  if (!(AVATAR_COLORS as readonly string[]).includes(args.avatarColor)) {
    throw new ConvexError('アバターカラーが不正です。')
  }
  return { name, role, bio }
}

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    bio: v.string(),
    avatarColor: v.string(),
  },
  handler: async (ctx, args) => {
    const { name, role, bio } = validateStylistFields(args)

    const stylists = await ctx.db.query('stylists').collect()
    const sortOrder = stylists.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1

    return await ctx.db.insert('stylists', {
      name,
      role,
      bio,
      avatarColor: args.avatarColor,
      active: true,
      sortOrder,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('stylists'),
    name: v.string(),
    role: v.string(),
    bio: v.string(),
    avatarColor: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new ConvexError('スタイリストが見つかりません。')
    }
    const { name, role, bio } = validateStylistFields(args)

    await ctx.db.patch(args.id, {
      name,
      role,
      bio,
      avatarColor: args.avatarColor,
      active: args.active,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('stylists') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new ConvexError('スタイリストが見つかりません。')
    }
    await ctx.db.delete(args.id)
  },
})
