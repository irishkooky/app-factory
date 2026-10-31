import { createTheme, type MantineColorsTuple } from '@mantine/core'

// 深い瑠璃色（水）と、工具の黄色の差し色。紙色は少し青みのある白。
// CSS 変数（--st-*）は __root.tsx でこの color から作る。色を変えるときはここだけ直す。
export const color = {
  ink: '#121a2e',
  sub: '#3d4760',
  muted: '#6b7489',
  line: '#dfe3ee',
  paper: '#f5f6fa',
  paperDeep: '#e8ebf3',
  deep: '#0f1f4d',
  deepSoft: '#1b3275',
  accent: '#ffd23f',
  accentDeep: '#a37a00',
  accentInk: '#2a2000',
  open: '#34c77b',
  /** ヒーローの背景のにじみ（rgb の並び） */
  glow: '90, 140, 255',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
/** 見出し。太いゴシックで、はっきり見せる */
export const serif = sans
/** 数字と英字の飾り（番号・STEP など） */
export const display = "'Outfit', 'Zen Kaku Gothic New', sans-serif"

/** Google Fonts の読み込み（__root.tsx が使う） */
export const fontsHref =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'

const brand: MantineColorsTuple = ['#eceffa', '#d3daf2', '#a8b6e4', '#7c90d5', '#5a72c8', '#4460bd', '#3550a6', '#284188', '#1b3275', '#0f1f4d']
const accent: MantineColorsTuple = ['#fffae6', '#fff2c2', '#ffe78f', '#ffdc5f', '#ffd23f', '#f2bd14', '#cc9c00', '#a37a00', '#7d5d00', '#5a4300']

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
