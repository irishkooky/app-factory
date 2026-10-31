import { createTheme, type MantineColorsTuple } from '@mantine/core'

// 夜明け前の紺（澄んだ空気）と、空色の差し色。紙色は青みのある白。
// CSS 変数（--st-*）は __root.tsx でこの color から作る。色を変えるときはここだけ直す。
export const color = {
  ink: '#0f1d2e',
  sub: '#3b4a5c',
  muted: '#6a7686',
  line: '#dde4ec',
  paper: '#f4f7fb',
  paperDeep: '#e6edf5',
  deep: '#0d2240',
  deepSoft: '#173a63',
  accent: '#86d4ff',
  accentDeep: '#1a72b8',
  accentInk: '#06213a',
  open: '#34c77b',
  /** ヒーローの背景のにじみ（rgb の並び） */
  glow: '120, 190, 255',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
/** 見出し。太いゴシックで、はっきり見せる */
export const serif = sans
/** 数字と英字の飾り（番号・STEP など） */
export const display = "'Outfit', 'Zen Kaku Gothic New', sans-serif"

/** Google Fonts の読み込み（__root.tsx が使う） */
export const fontsHref =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'

const brand: MantineColorsTuple = ['#ebf2fa', '#d3e2f2', '#a7c4e4', '#7aa5d5', '#5489c6', '#3a72b0', '#2a5d94', '#204a78', '#173a63', '#0d2240']
const accent: MantineColorsTuple = ['#eaf7ff', '#d2eeff', '#aee1ff', '#86d4ff', '#5ec2f7', '#3aa9e6', '#258ed0', '#1a72b8', '#155b93', '#0f446e']

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
