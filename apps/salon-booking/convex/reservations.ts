import { ConvexError, v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import {
  BOOKING_LEAD_MINUTES,
  CLOSE_MINUTES,
  CLOSED_WEEKDAY,
  MAX_ADVANCE_DAYS,
  OPEN_MINUTES,
  SLOT_STEP,
  addDaysToDateString,
  isValidDateString,
  jstNowMinutes,
  jstTodayString,
  overlaps,
  weekdayOfDateString,
} from './lib'

const FULLY_BOOKED_MESSAGE =
  '申し訳ありません、その時間は埋まってしまいました。別の時間をお選びください。'

function buildSlotStarts(durationMinutes: number): number[] {
  const starts: number[] = []
  for (let start = OPEN_MINUTES; start + durationMinutes <= CLOSE_MINUTES; start += SLOT_STEP) {
    starts.push(start)
  }
  return starts
}

async function confirmedReservationsFor(
  ctx: MutationCtx,
  stylistId: Id<'stylists'>,
  date: string,
) {
  const rows = await ctx.db
    .query('reservations')
    .withIndex('by_stylist_date', (q) => q.eq('stylistId', stylistId).eq('date', date))
    .collect()
  return rows.filter((r) => r.status === 'confirmed')
}

export const availability = query({
  args: {
    date: v.string(),
    menuId: v.id('menus'),
    stylistId: v.optional(v.id('stylists')),
  },
  handler: async (ctx, args) => {
    if (!isValidDateString(args.date)) {
      return { closed: true, reason: '日付が不正です。', slots: [] }
    }

    const today = jstTodayString()
    if (args.date < today) {
      return { closed: true, reason: '過去の日付は予約できません。', slots: [] }
    }

    const maxDate = addDaysToDateString(today, MAX_ADVANCE_DAYS)
    if (args.date > maxDate) {
      return { closed: true, reason: `予約は${MAX_ADVANCE_DAYS}日先までです。`, slots: [] }
    }

    if (weekdayOfDateString(args.date) === CLOSED_WEEKDAY) {
      return { closed: true, reason: '定休日です（火曜定休）。', slots: [] }
    }

    const menu = await ctx.db.get(args.menuId)
    if (!menu || !menu.active) {
      return { closed: true, reason: 'メニューが見つかりません。', slots: [] }
    }

    let targetStylists: Doc<'stylists'>[] = []
    if (args.stylistId !== undefined) {
      const stylist = await ctx.db.get(args.stylistId)
      if (stylist && stylist.active) {
        targetStylists = [stylist]
      }
    } else {
      const all = await ctx.db.query('stylists').collect()
      targetStylists = all.filter((s) => s.active)
    }

    if (targetStylists.length === 0) {
      return { closed: true, reason: 'スタイリストが見つかりません。', slots: [] }
    }

    const reservationsByStylist = new Map<Id<'stylists'>, Doc<'reservations'>[]>()
    for (const stylist of targetStylists) {
      const rows = await ctx.db
        .query('reservations')
        .withIndex('by_stylist_date', (q) => q.eq('stylistId', stylist._id).eq('date', args.date))
        .collect()
      reservationsByStylist.set(
        stylist._id,
        rows.filter((r) => r.status === 'confirmed'),
      )
    }

    const isToday = args.date === today
    const nowLimit = jstNowMinutes() + BOOKING_LEAD_MINUTES

    const slots = buildSlotStarts(menu.durationMinutes).map((startMinutes) => {
      if (isToday && startMinutes < nowLimit) {
        return { startMinutes, available: false }
      }
      const endMinutes = startMinutes + menu.durationMinutes
      const available = targetStylists.some((stylist) => {
        const existing = reservationsByStylist.get(stylist._id) ?? []
        return !existing.some((r) => overlaps(startMinutes, endMinutes, r.startMinutes, r.endMinutes))
      })
      return { startMinutes, available }
    })

    return { closed: false, slots }
  },
})

export const create = mutation({
  args: {
    menuId: v.id('menus'),
    stylistId: v.optional(v.id('stylists')),
    date: v.string(),
    startMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId)
    if (!menu || !menu.active) {
      throw new ConvexError('メニューが見つかりません。')
    }

    if (!isValidDateString(args.date)) {
      throw new ConvexError('日付が不正です。')
    }
    const today = jstTodayString()
    if (args.date < today) {
      throw new ConvexError('過去の日付には予約できません。')
    }
    const maxDate = addDaysToDateString(today, MAX_ADVANCE_DAYS)
    if (args.date > maxDate) {
      throw new ConvexError(`予約は${MAX_ADVANCE_DAYS}日先までです。`)
    }
    if (weekdayOfDateString(args.date) === CLOSED_WEEKDAY) {
      throw new ConvexError('火曜日は定休日です。')
    }

    if (
      !Number.isInteger(args.startMinutes) ||
      args.startMinutes < OPEN_MINUTES ||
      (args.startMinutes - OPEN_MINUTES) % SLOT_STEP !== 0 ||
      args.startMinutes + menu.durationMinutes > CLOSE_MINUTES
    ) {
      throw new ConvexError('予約時間が不正です。')
    }

    const endMinutes = args.startMinutes + menu.durationMinutes

    if (args.date === today && args.startMinutes < jstNowMinutes() + BOOKING_LEAD_MINUTES) {
      throw new ConvexError('この時間は既に受付を終了しました。別の時間をお選びください。')
    }

    const customerName = args.customerName.trim()
    if (customerName.length < 1 || customerName.length > 30) {
      throw new ConvexError('お名前は1〜30文字で入力してください。')
    }

    const customerPhone = args.customerPhone.trim()
    if (!/^[0-9+\-\s]+$/.test(customerPhone)) {
      throw new ConvexError('電話番号の形式が正しくありません。')
    }
    const digits = customerPhone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) {
      throw new ConvexError('電話番号は10〜11桁の数字で入力してください。')
    }

    let note: string | undefined
    if (args.note !== undefined) {
      const trimmed = args.note.trim()
      if (trimmed.length > 200) {
        throw new ConvexError('ご要望は200文字以内で入力してください。')
      }
      note = trimmed.length > 0 ? trimmed : undefined
    }

    let assignedStylist: Doc<'stylists'> | null = null

    if (args.stylistId !== undefined) {
      const stylist = await ctx.db.get(args.stylistId)
      if (!stylist || !stylist.active) {
        throw new ConvexError('指定されたスタイリストが見つかりません。')
      }
      const existing = await confirmedReservationsFor(ctx, stylist._id, args.date)
      const hasOverlap = existing.some((r) =>
        overlaps(args.startMinutes, endMinutes, r.startMinutes, r.endMinutes),
      )
      if (hasOverlap) {
        throw new ConvexError(FULLY_BOOKED_MESSAGE)
      }
      assignedStylist = stylist
    } else {
      const all = await ctx.db.query('stylists').collect()
      const activeSorted = all.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder)
      for (const stylist of activeSorted) {
        const existing = await confirmedReservationsFor(ctx, stylist._id, args.date)
        const hasOverlap = existing.some((r) =>
          overlaps(args.startMinutes, endMinutes, r.startMinutes, r.endMinutes),
        )
        if (!hasOverlap) {
          assignedStylist = stylist
          break
        }
      }
      if (!assignedStylist) {
        throw new ConvexError(FULLY_BOOKED_MESSAGE)
      }
    }

    const reservationId = await ctx.db.insert('reservations', {
      menuId: args.menuId,
      stylistId: assignedStylist._id,
      date: args.date,
      startMinutes: args.startMinutes,
      endMinutes,
      customerName,
      customerPhone,
      note,
      status: 'confirmed',
    })

    return {
      reservationId,
      stylistId: assignedStylist._id,
      stylistName: assignedStylist.name,
      endMinutes,
    }
  },
})

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('reservations')
      .withIndex('by_date', (q) => q.eq('date', args.date))
      .collect()
    rows.sort((a, b) => a.startMinutes - b.startMinutes)

    return await Promise.all(
      rows.map(async (r) => {
        const menu = await ctx.db.get(r.menuId)
        const stylist = await ctx.db.get(r.stylistId)
        return {
          ...r,
          menuName: menu?.name ?? '（削除済みメニュー）',
          menuPrice: menu?.price ?? 0,
          durationMinutes: menu?.durationMinutes ?? r.endMinutes - r.startMinutes,
          stylistName: stylist?.name ?? '（削除済みスタイリスト）',
        }
      }),
    )
  },
})

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const today = jstTodayString()
    const rows = await ctx.db
      .query('reservations')
      .withIndex('by_date', (q) => q.gte('date', today))
      .collect()
    rows.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1
      }
      return a.startMinutes - b.startMinutes
    })
    const limited = rows.slice(0, 200)

    return await Promise.all(
      limited.map(async (r) => {
        const menu = await ctx.db.get(r.menuId)
        const stylist = await ctx.db.get(r.stylistId)
        return {
          ...r,
          menuName: menu?.name ?? '（削除済みメニュー）',
          menuPrice: menu?.price ?? 0,
          durationMinutes: menu?.durationMinutes ?? r.endMinutes - r.startMinutes,
          stylistName: stylist?.name ?? '（削除済みスタイリスト）',
        }
      }),
    )
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('reservations'),
    status: v.union(v.literal('confirmed'), v.literal('done'), v.literal('cancelled')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new ConvexError('予約が見つかりません。')
    }
    await ctx.db.patch(args.id, { status: args.status })
  },
})
