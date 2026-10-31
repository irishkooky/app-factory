import { createTheme, type MantineColorsTuple } from '@mantine/core'

// 深い青緑（冷房の空気・清潔さ）と、ミントの差し色。紙色は少し青みのある白。
// CSS 変数（--st-*）は __root.tsx でこの color から作る。色を変えるときはここだけ直す。
export const color = {
  ink: '#10242b',
  sub: '#3f5359',
  muted: '#6b7c81',
  line: '#dbe5e6',
  paper: '#f3f7f7',
  paperDeep: '#e6eeef',
  deep: '#0b2a33',
  deepSoft: '#12404c',
  accent: '#6fdcc4',
  accentDeep: '#1f8f78',
  accentInk: '#06261f',
  open: '#34c77b',
  /** ヒーローの背景のにじみ（rgb の並び） */
  glow: '96, 196, 220',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
/** 見出し。太いゴシックで、はっきり見せる */
export const serif = sans
/** 数字と英字の飾り（番号・STEP など） */
export const display = "'Outfit', 'Zen Kaku Gothic New', sans-serif"

/** Google Fonts の読み込み（__root.tsx が使う） */
export const fontsHref =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'

const brand: MantineColorsTuple = ['#eaf5f6', '#d3e9ec', '#a6d2d8', '#76b9c2', '#4f9fab', '#358795', '#246f7c', '#185663', '#12404c', '#0b2a33']
const accent: MantineColorsTuple = ['#e9fbf6', '#cdf4ea', '#a3ead9', '#6fdcc4', '#47cdb0', '#2fb89a', '#24a287', '#1f8f78', '#17705e', '#0f5245']

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
