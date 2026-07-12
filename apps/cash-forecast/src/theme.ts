import { createTheme, Text } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily: "'Inter', 'Hiragino Sans', sans-serif",
  components: {
    Text: Text.extend({
      styles: { root: { fontVariantNumeric: 'tabular-nums' } },
    }),
  },
})
