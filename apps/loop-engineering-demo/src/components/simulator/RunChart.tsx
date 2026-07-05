import { useState } from 'react'
import { Text, useComputedColorScheme } from '@mantine/core'
import { INITIAL_PASSING, TOTAL_TESTS, type FeedbackQuality, type RunResult } from './engine'

interface RunChartProps {
  runs: RunResult[]
}

interface ColorMap {
  strong: string
  weak: string
  none: string
  grid: string
  axisText: string
}

const LIGHT_COLORS: ColorMap = {
  strong: '#2a78d6',
  weak: '#eda100',
  none: '#e34948',
  grid: '#e1e0d9',
  axisText: '#898781',
}

const DARK_COLORS: ColorMap = {
  strong: '#3987e5',
  weak: '#c98500',
  none: '#e66767',
  grid: '#2c2c2a',
  axisText: '#898781',
}

const QUALITY_LABEL: Record<FeedbackQuality, string> = {
  strong: '強い',
  weak: '弱い',
  none: 'なし',
}

const WIDTH = 640
const HEIGHT = 260
const MARGIN_LEFT = 40
const MARGIN_BOTTOM = 24
// 凡例のための余白。この帯を y=10 のグリッド線より上に確保しておかないと、
// 早く収束したランの終端ラベル（例:「10/10」）が凡例テキストに重なって
// 読めなくなる（実機検証で確認済みのバグ）。
const MARGIN_TOP = 40
const MARGIN_RIGHT = 48

interface HoverPoint {
  x: number
  y: number
  iteration: number
  value: number
}

export function RunChart({ runs }: Readonly<RunChartProps>) {
  const colorScheme = useComputedColorScheme('light')
  const colors = colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS
  const [hover, setHover] = useState<HoverPoint | null>(null)

  if (runs.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        実行するとここに収束グラフが描かれます
      </Text>
    )
  }

  const maxEventCount = runs.reduce((max, run) => Math.max(max, run.events.length), 0)
  const maxIteration = Math.max(15, maxEventCount)

  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

  const xScale = (iteration: number) =>
    MARGIN_LEFT + (maxIteration === 0 ? 0 : (iteration / maxIteration) * plotWidth)
  const yScale = (value: number) =>
    MARGIN_TOP + plotHeight - (value / TOTAL_TESTS) * plotHeight

  const gridValues = [0, 2, 4, 6, 8, 10]

  const showLegend = runs.length >= 2

  // 終端ラベルのY位置の簡易衝突回避: 近い値は少しずらす
  const endLabelPositions = runs.map((run) => {
    const finalValue = run.finalPassing
    return { quality: run.quality, y: yScale(finalValue), value: finalValue }
  })
  for (let i = 0; i < endLabelPositions.length; i++) {
    for (let j = 0; j < i; j++) {
      if (Math.abs(endLabelPositions[i].y - endLabelPositions[j].y) < 10) {
        endLabelPositions[i].y += 8
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      style={{ height: HEIGHT, display: 'block' }}
      role="img"
      aria-label="テスト通過数の収束グラフ"
    >
      {/* グリッド線 */}
      {gridValues.map((value) => {
        const y = yScale(value)
        return (
          <g key={value}>
            <line
              x1={MARGIN_LEFT}
              x2={WIDTH - MARGIN_RIGHT}
              y1={y}
              y2={y}
              stroke={colors.grid}
              strokeWidth={1}
            />
            <text x={MARGIN_LEFT - 8} y={y + 4} fontSize={11} fill={colors.axisText} textAnchor="end">
              {value}
            </text>
          </g>
        )
      })}

      {/* ゴールライン注釈 */}
      <text
        x={WIDTH - MARGIN_RIGHT}
        y={yScale(TOTAL_TESTS) - 6}
        fontSize={11}
        fill={colors.axisText}
        textAnchor="end"
      >
        ゴール 10/10
      </text>

      {/* 凡例 */}
      {showLegend && (
        <g>
          {runs.map((run, index) => {
            const x = MARGIN_LEFT + index * 90
            return (
              <g key={run.quality} transform={`translate(${x}, 4)`}>
                <line x1={0} x2={16} y1={4} y2={4} stroke={colors[run.quality]} strokeWidth={2} />
                <text x={22} y={8} fontSize={11} fill={colors.axisText}>
                  {QUALITY_LABEL[run.quality]}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {/* 各ランの折れ線・マーカー */}
      {runs.map((run) => {
        const color = colors[run.quality]
        const points: { iteration: number; value: number; observed: boolean }[] = [
          { iteration: 0, value: INITIAL_PASSING, observed: false },
          ...run.events.map((event) => ({
            iteration: event.iteration,
            value: event.actualPassing,
            observed: event.observed !== null,
          })),
        ]

        const pathD = points
          .map((point, index) => {
            const x = xScale(point.iteration)
            const y = yScale(point.value)
            return `${index === 0 ? 'M' : 'L'}${x},${y}`
          })
          .join(' ')

        const endLabel = endLabelPositions.find((p) => p.quality === run.quality)

        return (
          <g key={run.quality}>
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {points.map((point) => {
              if (!point.observed) return null
              const x = xScale(point.iteration)
              const y = yScale(point.value)
              return (
                <g key={`${run.quality}-${point.iteration}`}>
                  <circle cx={x} cy={y} r={6} fill="none" stroke="var(--mantine-color-body)" strokeWidth={2} />
                  <circle cx={x} cy={y} r={4} fill={color} />
                </g>
              )
            })}
            {/* ホバー用の透明ヒット円 */}
            {points.map((point) => {
              const x = xScale(point.iteration)
              const y = yScale(point.value)
              return (
                <circle
                  key={`hit-${run.quality}-${point.iteration}`}
                  cx={x}
                  cy={y}
                  r={10}
                  fill="transparent"
                  onMouseEnter={() =>
                    setHover({ x, y, iteration: point.iteration, value: point.value })
                  }
                  onMouseLeave={() => setHover((current) => (current?.x === x && current?.y === y ? null : current))}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
            {endLabel && (
              <text
                x={xScale(points[points.length - 1].iteration) + 4}
                y={endLabel.y + 4}
                fontSize={11}
                fill={colors.axisText}
              >
                {endLabel.value}/{TOTAL_TESTS}
              </text>
            )}
          </g>
        )
      })}

      {/* ホバーツールチップ */}
      {hover && (
        <g transform={`translate(${Math.min(hover.x + 8, WIDTH - 130)}, ${Math.max(hover.y - 28, 4)})`}>
          <rect width={120} height={22} rx={4} fill="var(--mantine-color-body)" stroke={colors.grid} />
          <text x={6} y={15} fontSize={11} fill={colors.axisText}>
            反復{hover.iteration}: {hover.value}/{TOTAL_TESTS}
          </text>
        </g>
      )}
    </svg>
  )
}
