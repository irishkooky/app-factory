import { useEffect, useState } from 'react'
import { Box, Text } from '@mantine/core'
import { color } from '../theme'
import { site } from '../site.config'

/** 日本時間の今の曜日・時刻から、受付中かどうかを出す */
function status(now: Date) {
  const { schedule } = site.contact
  const jst = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60_000)
  const today = schedule[jst.getDay()]
  const hour = jst.getHours() + jst.getMinutes() / 60
  if (today && hour >= today[0] && hour < today[1]) {
    return { open: true, text: 'ただいま受付中', detail: `本日${today[1]}時まで` }
  }
  if (today && hour < today[0]) return { open: false, text: '受付時間外', detail: `本日${today[0]}時から` }
  const tomorrow = schedule[(jst.getDay() + 1) % 7]
  return { open: false, text: '受付時間外', detail: tomorrow ? `明日${tomorrow[0]}時から` : '' }
}

/**
 * 受付中かどうかの表示。SSR では時刻が決まらないので、マウントしてから出す。
 * tone: 濃い背景の上なら light。brief: 「本日20時まで」などの補足を省く
 */
export function OpenNow({ tone = 'dark', compact, brief }: { tone?: 'light' | 'dark'; compact?: boolean; brief?: boolean }) {
  const [state, setState] = useState<ReturnType<typeof status> | null>(null)
  useEffect(() => {
    setState(status(new Date()))
    const id = setInterval(() => setState(status(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  // 受付時間が公開されていない店では出さない
  if (!state || site.contact.schedule.length === 0) return null

  const light = tone === 'light'
  return (
    <Text
      c={light ? 'white' : 'black'}
      component="span"
      fw={700}
      fz={compact ? 12 : 'sm'}
      style={{ alignItems: 'center', display: 'inline-flex', gap: compact ? 6 : 8, whiteSpace: 'nowrap' }}
    >
      <Box
        component="span"
        h={compact ? 8 : 10}
        style={{
          background: state.open ? color.open : light ? 'rgba(255,255,255,0.4)' : '#b9b3a8',
          borderRadius: 999,
          boxShadow: state.open ? '0 0 0 4px rgba(52,199,123,0.22)' : undefined,
          flex: 'none',
        }}
        w={compact ? 8 : 10}
      />
      {state.text}
      {/* brief（スマホの画面下の帯）では電話番号を優先して、時刻の補足は出さない */}
      {state.detail && !brief && (
        <Box c={light ? 'rgba(255,255,255,0.7)' : 'dimmed'} component="span" fw={500}>
          （{state.detail}）
        </Box>
      )}
    </Text>
  )
}
