import { mutation } from './_generated/server'

const MENUS = [
  {
    name: 'カット + シャンプー・ブロー込み',
    description: '経験豊富なスタイリストによる骨格補正カット',
    category: 'カット',
    price: 4950,
    durationMinutes: 60,
  },
  {
    name: '【学割U24】カット',
    description: '24歳以下限定のお得なカットメニューです。',
    category: 'カット',
    price: 3300,
    durationMinutes: 60,
  },
  {
    name: 'カット + 透明感カラー',
    description: '人気No.1！イルミナカラー使用',
    category: 'カラー',
    price: 9900,
    durationMinutes: 120,
  },
  {
    name: 'リタッチカラー（根元染め）',
    description: '伸びてきた根元を自然な仕上がりに染め直します。',
    category: 'カラー',
    price: 5500,
    durationMinutes: 90,
  },
  {
    name: 'カット + デジタルパーマ',
    description: 'ふんわり長持ちするデジタルパーマとカットのセットです。',
    category: 'パーマ',
    price: 14300,
    durationMinutes: 150,
  },
  {
    name: '髪質改善トリートメント',
    description: 'うるツヤ髪へ導く酸熱トリートメント',
    category: 'トリートメント',
    price: 8800,
    durationMinutes: 90,
  },
  {
    name: '極上ヘッドスパ（30分）',
    description: '頭皮の凝りをほぐす至福のヘッドスパタイム。',
    category: 'ヘッドスパ',
    price: 4400,
    durationMinutes: 30,
  },
  {
    name: 'カット + カラー + トリートメント',
    description: '一番人気の贅沢フルコース',
    category: 'セットメニュー',
    price: 15400,
    durationMinutes: 150,
  },
]

const STYLISTS = [
  {
    name: '佐藤 美咲',
    role: '店長 / トップスタイリスト',
    bio: '骨格と髪質を見極めた再現性の高いスタイル提案が得意です。',
    avatarColor: 'orange',
  },
  {
    name: '田中 蓮',
    role: 'スタイリスト',
    bio: 'メンズカットからナチュラルなくせ毛カットまで幅広く対応します。',
    avatarColor: 'indigo',
  },
  {
    name: '鈴木 花音',
    role: 'カラーリスト',
    bio: 'トレンドカラーからダメージレスな縮毛矯正まで得意としています。',
    avatarColor: 'pink',
  },
  {
    name: '山本 大輝',
    role: 'スタイリスト',
    bio: 'お客様のライフスタイルに寄り添ったスタイル提案を心がけています。',
    avatarColor: 'teal',
  },
]

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingMenus = await ctx.db.query('menus').take(1)
    const existingStylists = await ctx.db.query('stylists').take(1)
    if (existingMenus.length > 0 || existingStylists.length > 0) {
      return 'skipped' as const
    }

    for (const [i, menu] of MENUS.entries()) {
      await ctx.db.insert('menus', {
        ...menu,
        active: true,
        sortOrder: i + 1,
      })
    }

    for (const [i, stylist] of STYLISTS.entries()) {
      await ctx.db.insert('stylists', {
        ...stylist,
        active: true,
        sortOrder: i + 1,
      })
    }

    return 'seeded' as const
  },
})
