import { colorsTuple, createTheme } from '@mantine/core'
import { site } from './site.config'

// 雛形の theme.ts をもとに、primaryColor だけ site.config.ts の theme で差し替える。
// 0〜2 は淡い背景、6 が基本色、8〜9 が濃い色として使う。
const { primary, primaryDark, soft } = site.theme

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: {
    brand: colorsTuple([
      soft,
      soft,
      soft,
      primary,
      primary,
      primary,
      primary,
      primaryDark,
      primaryDark,
      primaryDark,
    ]),
  },
  defaultRadius: 'md',
  fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', Meiryo, sans-serif",
  headings: {
    fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', Meiryo, sans-serif",
  },
})
