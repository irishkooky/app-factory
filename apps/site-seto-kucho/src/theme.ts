import { createTheme, type MantineColorsTuple } from '@mantine/core'

// 墨色に近い紺（工事の道具・確かさ）と、琥珀色の差し色。紙色は少し温かい白。
// CSS 変数（--st-*）は __root.tsx でこの color から作る。色を変えるときはここだけ直す。
export const color = {
  ink: '#1b1f26',
  sub: '#454b55',
  muted: '#727782',
  line: '#e3dfd6',
  paper: '#f6f4ef',
  paperDeep: '#ebe7de',
  deep: '#18202b',
  deepSoft: '#27323f',
  accent: '#ffb547',
  accentDeep: '#b8650f',
  accentInk: '#2b1700',
  open: '#34c77b',
  /** ヒーローの背景のにじみ（rgb の並び） */
  glow: '255, 170, 80',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
/** 見出し。太いゴシックで、はっきり見せる */
export const serif = sans
/** 数字と英字の飾り（番号・STEP など） */
export const display = "'Outfit', 'Zen Kaku Gothic New', sans-serif"

/** Google Fonts の読み込み（__root.tsx が使う） */
export const fontsHref =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'

const brand: MantineColorsTuple = ['#eef1f5', '#d8dee6', '#b3bfcd', '#8c9eb3', '#6c8199', '#566a82', '#44566b', '#354456', '#27323f', '#18202b']
const accent: MantineColorsTuple = ['#fff6e6', '#ffeac4', '#ffd796', '#ffc56b', '#ffb547', '#f29b26', '#d97f16', '#b8650f', '#924f0d', '#6e3b0a']

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 8,
  colors: { brand, accent },
  black: color.ink,
  defaultRadius: 'md',
  fontFamily: sans,
  headings: {
    fontFamily: serif,
    fontWeight: '900',
  },
})
