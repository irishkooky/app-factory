import { createTheme, type MantineColorsTuple } from '@mantine/core'

// 深い緑（暮らし・安心）と、あたたかい橙の差し色。紙色は少し温かい白。
// CSS 変数（--st-*）は __root.tsx でこの color から作る。色を変えるときはここだけ直す。
export const color = {
  ink: '#172019',
  sub: '#424d45',
  muted: '#6f7a72',
  line: '#e0e2d8',
  paper: '#f6f6f0',
  paperDeep: '#eaebe1',
  deep: '#12352a',
  deepSoft: '#1d4d3c',
  accent: '#ffa26b',
  accentDeep: '#b8521a',
  accentInk: '#2e1205',
  open: '#34c77b',
  /** ヒーローの背景のにじみ（rgb の並び） */
  glow: '255, 170, 110',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
/** 見出し。太いゴシックで、はっきり見せる */
export const serif = sans
/** 数字と英字の飾り（番号・STEP など） */
export const display = "'Outfit', 'Zen Kaku Gothic New', sans-serif"

/** Google Fonts の読み込み（__root.tsx が使う） */
export const fontsHref =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'

const brand: MantineColorsTuple = ['#ebf4f0', '#d2e6dd', '#a6cdbc', '#78b399', '#539b7c', '#3c8467', '#2e6d55', '#245c47', '#1d4d3c', '#12352a']
const accent: MantineColorsTuple = ['#fff3ec', '#ffe2d1', '#ffc8a7', '#ffb487', '#ffa26b', '#f6874a', '#de6c2f', '#b8521a', '#924016', '#6d2f10']

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
