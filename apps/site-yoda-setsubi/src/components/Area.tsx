import { Box, Group, Text } from '@mantine/core'
import { serif } from '../theme'
import { site } from '../site.config'
import { KANAZAWA_PATH, MAP_HEIGHT, MAP_WIDTH, NEIGHBORS, PX_PER_KM, SHOP, TOWNS } from '../data/kanazawa-map'
import { Section } from './Section'

/** 地図に名前を出す町（近い町どうしで文字が重ならないものだけ） */
const MAP_TOWNS = ['能見台', '富岡西', '富岡東', '並木', '西柴', '釜利谷東', '釜利谷南', '六浦', '瀬戸', '大道', '朝比奈町', '谷津町', '柴町', '幸浦', '堀口']

/** 点の左に名前を書く町（右に書くと隣の町の名前に重なる） */
const LABEL_LEFT = new Set(['朝比奈町'])

/** 地図の上の文字に白い縁を付けて、線や点線の上でも読めるようにする */
const halo = { paintOrder: 'stroke', stroke: '#fff', strokeLinejoin: 'round', strokeWidth: 8 } as const

/** 町の一覧を、地図の点線と同じ距離で分ける */
const RINGS = [
  { label: '2kmまで', max: 2 },
  { label: '4kmまで', max: 4 },
  { label: '4kmより先', max: Infinity },
]

/** 店から町の代表点までの直線距離（km）。座標が無い町は一番遠い組に入れる */
function distanceKm(town: string) {
  const point = TOWNS[town]
  return point ? Math.hypot(point[0] - SHOP[0], point[1] - SHOP[1]) / PX_PER_KM : Infinity
}

/** まわりの市区の名前の位置（地図の枠の中に収まるように手で決めた） */
const NEIGHBOR_LABELS: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  港南区: [40, 160, 'start'],
  磯子区: [300, 150, 'middle'],
  栄区: [24, 560, 'start'],
  鎌倉市: [24, 1050, 'start'],
  逗子市: [180, 1262, 'middle'],
  横須賀市: [660, 1210, 'middle'],
}

export function Area() {
  const { area, company } = site
  const [sx, sy] = SHOP
  const towns = ['釜利谷西', ...area.towns].sort((a, b) => distanceKm(a) - distanceKm(b))
  const groups = RINGS.map((ring, i) => ({
    ...ring,
    towns: towns.filter((town) => distanceKm(town) <= ring.max && distanceKm(town) > (RINGS[i - 1]?.max ?? -1)),
  })).filter((group) => group.towns.length > 0)

  return (
    <Section
      id="area"
      kicker="対応エリア"
      lead={`${company.name}は、金沢区の釜利谷西にあります。地図の点線は、ここからの距離（2km・4km）です。`}
      no="07"
      title={'釜利谷西から、\n金沢区のご家庭へ。'}
      tone="white"
    >
      <Box className="yd-area-grid">
        <Box style={{ border: '1px solid var(--yd-line)', borderRadius: 20, overflow: 'hidden' }}>
          <svg
            aria-label={`${company.name}の場所と金沢区の地図`}
            role="img"
            style={{ display: 'block', height: 'auto', width: '100%' }}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            <rect fill="#dce8f1" height={MAP_HEIGHT} width={MAP_WIDTH} />
            {NEIGHBORS.map((n) => (
              <path d={n.d} fill="#efe9df" key={n.name} stroke="#d6cbb9" strokeLinejoin="round" strokeWidth={2} />
            ))}
            <path d={KANAZAWA_PATH} fill="#fff" stroke="#163450" strokeLinejoin="round" strokeWidth={4} />

            {NEIGHBORS.map((n) => {
              const label = NEIGHBOR_LABELS[n.name]
              if (!label) return null
              return (
                <text fill="#9a8f7e" fontSize={30} fontWeight={700} key={n.name} letterSpacing={4} textAnchor={label[2]} x={label[0]} y={label[1]}>
                  {n.name}
                </text>
              )
            })}
            <text fill="#7f9db5" fontSize={30} fontWeight={700} letterSpacing={6} textAnchor="end" x={976} y={92}>
              東京湾
            </text>
            <text fill="#163450" fontFamily={serif} fontSize={40} fontWeight={800} letterSpacing={8} opacity={0.14} textAnchor="middle" x={600} y={470}>
              金沢区
            </text>

            {[2, 4].map((km) => (
              <g key={km}>
                <circle cx={sx} cy={sy} fill="none" opacity={0.55} r={km * PX_PER_KM} stroke="#b0733a" strokeDasharray="8 10" strokeWidth={2.5} />
                <text fill="#b0733a" fontSize={26} fontWeight={700} textAnchor="middle" x={sx} y={sy - km * PX_PER_KM - 10} {...halo}>
                  {km}km
                </text>
              </g>
            ))}

            {MAP_TOWNS.map((town) => {
              const point = TOWNS[town]
              if (!point) return null
              const [x, y] = point
              const left = LABEL_LEFT.has(town)
              return (
                <g key={town}>
                  <circle cx={x} cy={y} fill="#163450" r={6} />
                  <text fill="#2e3b46" fontSize={30} fontWeight={700} textAnchor={left ? 'end' : 'start'} x={left ? x - 12 : x + 12} y={y + 10} {...halo}>
                    {town}
                  </text>
                </g>
              )
            })}

            <circle className="yd-map-pulse" cx={sx} cy={sy} fill="#e2ad6e" r={20} />
            <circle cx={sx} cy={sy} fill="#b0733a" r={15} stroke="#fff" strokeWidth={5} />
            <g transform={`translate(${sx} ${sy - 40})`}>
              <rect fill="#163450" height={58} rx={12} width={200} x={-100} y={-58} />
              <path d="M-12 0 L0 14 L12 0 Z" fill="#163450" />
              <text fill="#fff" fontFamily={serif} fontSize={30} fontWeight={800} letterSpacing={4} textAnchor="middle" y={-19}>
                {company.name}
              </text>
            </g>
          </svg>
        </Box>

        <Box>
          <Text c="var(--yd-brass-deep)" fw={700} fz={12} style={{ letterSpacing: '0.14em' }}>
            伺うおもな地域
          </Text>
          <Text c="dimmed" fz={12} mt={4}>
            {company.name}からの直線距離の目安で分けています
          </Text>
          {groups.map((group) => (
            <Box key={group.label} mt={22}>
              <Group gap={10} wrap="nowrap">
                <Text c="var(--yd-brass-deep)" ff={serif} fw={800} fz={15} style={{ whiteSpace: 'nowrap' }}>
                  {group.label}
                </Text>
                <Box h={1} style={{ background: 'var(--yd-line)', flex: 1 }} />
              </Group>
              <Group gap={8} mt={12}>
                {group.towns.map((town) => (
                  <Text
                    bg={town === '釜利谷西' ? 'var(--yd-indigo-soft)' : 'var(--yd-paper)'}
                    c={town === '釜利谷西' ? 'white' : 'black'}
                    fw={700}
                    fz={{ base: 14, sm: 15 }}
                    key={town}
                    px={14}
                    py={7}
                    style={{ border: '1px solid var(--yd-line)', borderRadius: 999 }}
                  >
                    {town}
                  </Text>
                ))}
              </Group>
            </Box>
          ))}
          <Text c="var(--yd-sub)" fz={14} lh={1.9} mt={20}>
            {area.note}
          </Text>
          <Text c="dimmed" fz={11} lh={1.7} mt={24}>
            地図：国土交通省「国土数値情報（行政区域データ）」、国土地理院「地名等検索」をもとに作成
          </Text>
        </Box>
      </Box>
    </Section>
  )
}
