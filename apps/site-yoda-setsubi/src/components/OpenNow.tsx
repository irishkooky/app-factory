import { useEffect, useState } from 'react'
import { Box, Text } from '@mantine/core'
import { site } from '../site.config'

/** 日本時間の今の曜日・時刻から、受付中かどうかを出す。SSR では何も出さない */
function status(now: Date) {
  const schedule = site.contact.schedule
  if (!schedule) return null
  const jst = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60_000)
  const today = schedule[jst.getDay()]
  const hour = jst.getHours() + jst.getMinutes() / 60
  if (today && hour >= today[0] && hour < today[1]) return { open: true, text: `ただいま受付中（本日${today[1]}時まで）` }
  const tomorrow = schedule[(jst.getDay() + 1) % 7]
  if (today && hour < today[0]) return { open: false, text: `本日は${today[0]}時から受付` }
  return { open: false, text: tomorrow ? `受付時間外です（明日${tomorrow[0]}時から）` : '受付時間外です' }
}

export function OpenNow() {
  const [state, setState] = useState<ReturnType<typeof status>>(null)
  useEffect(() => {
    setState(status(new Date()))
    const id = setInterval(() => setState(status(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  if (!state) return null

  return (
    <Text component="span" fw={700} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Box
        component="span"
        h={10}
        style={{ borderRadius: 999, background: state.open ? '#3ddc84' : '#bbb', boxShadow: state.open ? '0 0 0 4px rgba(61,220,132,0.25)' : undefined }}
        w={10}
      />
      {state.text}
    </Text>
  )
}
