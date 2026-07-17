import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  menus: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(), // MENU_CATEGORIES のいずれか（mutationで検証）
    price: v.number(), // 税込円
    durationMinutes: v.number(), // 30の倍数
    active: v.boolean(),
    sortOrder: v.number(),
  }),
  stylists: defineTable({
    name: v.string(),
    role: v.string(), // 例: "店長 / トップスタイリスト"
    bio: v.string(),
    avatarColor: v.string(), // Mantineの色名（AVATAR_COLORS のいずれか）
    active: v.boolean(),
    sortOrder: v.number(),
  }),
  reservations: defineTable({
    menuId: v.id('menus'),
    stylistId: v.id('stylists'),
    date: v.string(), // YYYY-MM-DD（JST）
    startMinutes: v.number(),
    endMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    note: v.optional(v.string()),
    status: v.union(v.literal('confirmed'), v.literal('done'), v.literal('cancelled')),
  })
    .index('by_date', ['date'])
    .index('by_stylist_date', ['stylistId', 'date']),
})
