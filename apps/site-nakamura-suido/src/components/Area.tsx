import { Box, Group, Text } from '@mantine/core'
import { color, display, serif } from '../theme'
import { site } from '../site.config'
import { CITY_PATH, MAP_HEIGHT, MAP_WIDTH, NEIGHBORS, PX_PER_KM, SHOP, TOWNS } from '../data/area-map'
import { Section } from './Section'

/** 地図の上の文字に白い縁を付けて、線や点線の上でも読めるようにする */
const halo = { paintOrder: 'stroke', stroke: '#fff', strokeLinejoin: 'round', strokeWidth: 8 } as const

/** 地図の点線の距離（km）。町の一覧も同じ距離で分ける */
const [NEAR, FAR] = site.area.rings ?? [2, 4]
const RINGS = [
  { label: `${NEAR}kmまで`, max: NEAR },
  { label: `${FAR}kmまで`, max: FAR },
  { label: `${FAR}kmより先`, max: Infinity },
]

const FONT = 26

/** 店から町の代表点までの直線距離（km） */
function distanceKm(point: [number, number]) {
  return Math.hypot(point[0] - SHOP[0], point[1] - SHOP[1]) / PX_PER_KM
}

const towns = Object.entries(TOWNS)
  .filter(([name]) => !name.startsWith('（'))
  .map(([name, point]) => ({ name, point, km: distanceKm(point) }))
  .sort((a, b) => a.km - b.km)

type Box4 = [number, number, number, number]
const overlaps = (a: Box4, b: Box4) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

/**
 * 地図に名前を出す町。店に近い町から順に、右か左に置いて、ほかの名前や店の札と重ならないものだけ残す。
 * 座標は地図の作り直しで変わるので、手で選ばずにここで決める
 */
const labels = (() => {
  const [sx, sy] = SHOP
  const taken: Box4[] = [[sx - 130, sy - 110, sx + 130, sy + 24]]
  const placed: { name: string; x: number; y: number; anchor: 'start' | 'end' }[] = []
  for (const town of towns) {
    const [x, y] = town.point
    const width = town.name.length * FONT + 8
    for (const anchor of ['start', 'end'] as const) {
      const box: Box4 = anchor === 'start' ? [x - 8, y - FONT, x + 14 + width, y + 12] : [x - 14 - width, y - FONT, x + 8, y + 12]
      if (box[0] < 4 || box[2] > MAP_WIDTH - 4 || box[1] < 4 || box[3] > MAP_HEIGHT - 4) continue
      if (taken.some((t) => overlaps(t, box))) continue
      taken.push(box)
      placed.push({ name: town.name, x: anchor === 'start' ? x + 12 : x - 12, y: y + 9, anchor })
      break
    }
  }
  return placed
})()

export function Area() {
  const { area, company } = site
  const [sx, sy] = SHOP
  const groups = RINGS.map((ring, i) => ({
    ...ring,
    towns: towns.filter((town) => town.km <= ring.max && town.km > (RINGS[i - 1]?.max ?? -1)).map((town) => town.name),
  })).filter((group) => group.towns.length > 0)
  const nameWidth = Math.max(200, company.name.length * 28 + 40)

  return (
    <Section
      id="area"
      kicker="対応エリア"
      lead={`${company.name}は、${area.city}の${area.home}にあります。地図の点線は、ここからの距離（${NEAR}km・${FAR}km）です。`}
      title={`${area.home}から、\n${area.city}のご家庭へ。`}
      tone="white"
    >
      <Box className="st-area-grid">
        <Box style={{ border: '1px solid var(--st-line)', borderRadius: 20, overflow: 'hidden' }}>
          <svg
            aria-label={`${company.name}の場所と${area.city}の地図`}
            role="img"
            style={{ display: 'block', height: 'auto', width: '100%' }}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            <rect fill={color.paperDeep} height={MAP_HEIGHT} width={MAP_WIDTH} />
            {NEIGHBORS.map((n) => (
              <path d={n.d} fill={color.paper} key={n.name} stroke={color.line} strokeLinejoin="round" strokeWidth={2.5} />
            ))}
            <path d={CITY_PATH} fill="#fff" stroke={color.deepSoft} strokeLinejoin="round" strokeWidth={4} />

            {NEIGHBORS.map((n) => (
              <text fill={color.muted} fontSize={30} fontWeight={700} key={n.name} letterSpacing={4} opacity={0.75} textAnchor="middle" x={n.label[0]} y={n.label[1]}>
                {n.name}
              </text>
            ))}

            {[NEAR, FAR].map((km) => (
              <g key={km}>
                <circle cx={sx} cy={sy} fill="none" opacity={0.6} r={km * PX_PER_KM} stroke={color.accentDeep} strokeDasharray="8 10" strokeWidth={2.5} />
                <text fill={color.accentDeep} fontFamily={display} fontSize={26} fontWeight={700} textAnchor="middle" x={sx} y={sy - km * PX_PER_KM - 10} {...halo}>
                  {km}km
                </text>
              </g>
            ))}

            {labels.map((label) => {
              const point = TOWNS[label.name]
              return (
                <g key={label.name}>
                  <circle cx={point[0]} cy={point[1]} fill={color.deepSoft} r={5.5} />
                  <text fill={color.ink} fontSize={FONT} fontWeight={700} textAnchor={label.anchor} x={label.x} y={label.y} {...halo}>
                    {label.name}
                  </text>
                </g>
              )
            })}

            <circle className="st-map-pulse" cx={sx} cy={sy} fill={color.accent} r={20} />
            <circle cx={sx} cy={sy} fill={color.accentDeep} r={15} stroke="#fff" strokeWidth={5} />
            <g transform={`translate(${Math.min(Math.max(sx, nameWidth / 2 + 8), MAP_WIDTH - nameWidth / 2 - 8)} ${sy - 40})`}>
              <rect fill={color.deepSoft} height={58} rx={12} width={nameWidth} x={-nameWidth / 2} y={-58} />
              <text fill="#fff" fontFamily={serif} fontSize={26} fontWeight={900} letterSpacing={2} textAnchor="middle" y={-20}>
                {company.name}
              </text>
            </g>
            <path d={`M${sx - 12} ${sy - 40} L${sx} ${sy - 26} L${sx + 12} ${sy - 40} Z`} fill={color.deepSoft} />
          </svg>
        </Box>

        <Box>
          <Text c="var(--st-accent-deep)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
            伺うおもな地域
          </Text>
          <Text c="dimmed" fz={12} mt={4}>
            {company.name}からの直線距離の目安で分けています
          </Text>
          {groups.map((group) => (
            <Box key={group.label} mt={22}>
              <Group gap={10} wrap="nowrap">
                <Text c="var(--st-accent-deep)" ff={display} fw={700} fz={15} style={{ whiteSpace: 'nowrap' }}>
                  {group.label}
                </Text>
                <Box h={1} style={{ background: 'var(--st-line)', flex: 1 }} />
              </Group>
              <Group gap={8} mt={12}>
                {group.towns.map((town) => (
                  <Text
                    bg={town === area.home ? 'var(--st-deep-soft)' : 'var(--st-paper)'}
                    c={town === area.home ? 'white' : 'black'}
                    fw={700}
                    fz={{ base: 14, sm: 15 }}
                    key={town}
                    px={14}
                    py={7}
                    style={{ border: '1px solid var(--st-line)', borderRadius: 999 }}
                  >
                    {town}
                  </Text>
                ))}
              </Group>
            </Box>
          ))}
          <Text c="var(--st-sub)" fz={14} lh={1.9} mt={20}>
            {area.note}
          </Text>
          <Text c="dimmed" fz={11} lh={1.7} mt={24}>
            地図：国土交通省「国土数値情報（行政区域データ）」、HeartRails Geo API（国土交通省「位置参照情報」）をもとに作成。店の位置は100mほどの目安です。
          </Text>
        </Box>
      </Box>
    </Section>
  )
}
