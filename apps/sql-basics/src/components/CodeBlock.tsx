import { Code } from '@mantine/core'

/** 長い行を折り返すコードブロック（横にはみ出して切れないように） */
export function CodeBlock({ children }: { children: string }) {
  return (
    <Code block fz="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {children}
    </Code>
  )
}
