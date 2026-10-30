import { createTheme } from '@mantine/core'

// 藍（水・誠実さ）と真鍮（蛇口や継手の金色）の2色に、生成りの紙色を合わせる。
// brand: 0〜2 は淡い背景、6 が基本色、8〜9 がヒーローや帯の濃い藍。brass は差し色と暗い面のボタン。
export const color = {
  ink: '#13202b',
  sub: '#43505b',
  muted: '#6b7680',
  line: '#e4ded3',
  paper: '#f7f4ee',
  paperDeep: '#efe9df',
  indigo: '#0f2638',
  indigoSoft: '#163450',
  brass: '#e2ad6e',
  brassDeep: '#b0733a',
  open: '#34c77b',
}

const sans = "'Zen Kaku Gothic New', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
export const serif = "'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif"

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 8,
  colors: {
    brand: ['#eef3f8', '#dce6f0', '#b9cde0', '#93b1cf', '#6e94bd', '#4c79a8', '#2b5a85', '#1f4568', '#163450', '#0f2638'],
    brass: ['#fbf4ea', '#f6e6cf', '#f0d2ad', '#e9bd89', '#e2ad6e', '#d89c5d', '#cf9152', '#b0733a', '#8a5628', '#6b421e'],
  },
  black: color.ink,
  defaultRadius: 'md',
  fontFamily: sans,
  headings: {
    fontFamily: serif,
    fontWeight: '700',
  },
})
