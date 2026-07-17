import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { MENU_CATEGORIES } from './lib'

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db.query('menus').collect()
    return menus.filter((m) => m.active).sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db.query('menus').collect()
    return menus.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

function validateMenuFields(args: {
  name: string
  description: string
  category: string
  price: number
  durationMinutes: number
}) {
  const name = args.name.trim()
  if (name.length < 1 || name.length > 50) {
    throw new ConvexError('メニュー名は1〜50文字で入力してください。')
  }
  const description = args.description.trim()
  if (description.length > 200) {
    throw new ConvexError('説明は200文字以内で入力してください。')
  }
  if (!(MENU_CATEGORIES as readonly string[]).includes(args.category)) {
    throw new ConvexError('カテゴリが不正です。')
  }
  if (
    !Number.isInteger(args.price) ||
    args.price < 0 ||
    args.price > 99999
  ) {
    throw new ConvexError('価格は0〜99999の整数で入力してください。')
  }
  if (
    !Number.isInteger(args.durationMinutes) ||
    args.durationMinutes % 30 !== 0 ||
    args.durationMinutes < 30 ||
    args.durationMinutes > 240
  ) {
    throw new ConvexError('所要時間は30〜240分（30分刻み）で入力してください。')
  }
  return { name, description }
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { name, description } = validateMenuFields(args)

    const menus = await ctx.db.query('menus').collect()
    const sortOrder = menus.reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1

    return await ctx.db.insert('menus', {
      name,
      description,
      category: args.category,
      price: args.price,
      durationMinutes: args.durationMinutes,
      active: true,
      sortOrder,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('menus'),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    durationMinutes: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new ConvexError('メニューが見つかりません。')
    }
    const { name, description } = validateMenuFields(args)

    await ctx.db.patch(args.id, {
      name,
      description,
      category: args.category,
      price: args.price,
      durationMinutes: args.durationMinutes,
      active: args.active,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('menus') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new ConvexError('メニューが見つかりません。')
    }
    await ctx.db.delete(args.id)
  },
})
