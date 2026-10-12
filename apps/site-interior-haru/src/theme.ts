import { colorsTuple, createTheme } from '@mantine/core'
import { site } from './site.config'

// 雛形の theme.ts をもとに、色だけ site.config.ts の theme で差し替える。
// brand: 0〜2 は淡い背景、6 が基本色、8〜9 が濃い色。accent は小見出しと数字の差し色。
const { primary, primaryDark, soft, accent } = site.theme

const sans = "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
export const serif = "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif"

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: {
    brand: colorsTuple([soft, soft, soft, primary, primary, primary, primary, primaryDark, primaryDark, primaryDark]),
    accent: colorsTuple(accent),
  },
  black: '#22201c',
  defaultRadius: 'sm',
  fontFamily: sans,
  headings: {
    fontFamily: serif,
    fontWeight: '600',
  },
})
