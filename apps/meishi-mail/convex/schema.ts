import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  inquiries: defineTable({
    kind: v.string(),
    message: v.string(),
    name: v.string(),
    company: v.string(),
    email: v.string(),
    platform: v.string(),
    userAgent: v.string(),
    scanCount: v.number(),
  }),
})
