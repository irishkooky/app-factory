export type Gender = 'male' | 'female' | 'other'

export type Person = {
  id: string
  name: string
  gender: Gender
  birth?: string
  death?: string
  note?: string
  /** 親（最大2人）。親子関係は子の側にだけ持つ */
  parentIds: string[]
  /** 配偶者。双方向に持つ */
  spouseIds: string[]
}

export const BOX_W = 150
export const BOX_H = 64
const H_GAP = 28
const UNIT_GAP = 44
const V_GAP = 84
export const PAD = 32

export type Placed = { person: Person; x: number; y: number; gen: number }

export type Edge = { key: string; d: string; kind: 'spouse' | 'child' }

export type Layout = {
  nodes: Placed[]
  edges: Edge[]
  width: number
  height: number
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** id → Person の索引 */
export function indexById(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.id, p]))
}

export function childrenOf(people: Person[], id: string): Person[] {
  return people.filter((p) => p.parentIds.includes(id))
}

/** id の子孫（自分は含まない）。親に選ぶと循環になる人の集合 */
export function descendantsOf(people: Person[], id: string): Set<string> {
  const out = new Set<string>()
  const stack = [id]
  while (stack.length > 0) {
    const cur = stack.pop()!
    for (const c of childrenOf(people, cur)) {
      if (!out.has(c.id)) {
        out.add(c.id)
        stack.push(c.id)
      }
    }
  }
  return out
}

/** 参照の整合性を保つ: 存在しない id を消し、配偶者を双方向にし、親を2人までにする */
export function normalize(people: Person[]): Person[] {
  const ids = new Set(people.map((p) => p.id))
  const spouses = new Map<string, Set<string>>(people.map((p) => [p.id, new Set<string>()]))
  for (const p of people) {
    for (const s of p.spouseIds) {
      if (s === p.id || !ids.has(s)) continue
      spouses.get(p.id)!.add(s)
      spouses.get(s)!.add(p.id)
    }
  }
  return people.map((p) => ({
    ...p,
    parentIds: [...new Set(p.parentIds)].filter((x) => x !== p.id && ids.has(x)).slice(0, 2),
    spouseIds: [...spouses.get(p.id)!],
  }))
}

/** 人物を消し、その人への参照もすべて外す */
export function removePerson(people: Person[], id: string): Person[] {
  return people
    .filter((p) => p.id !== id)
    .map((p) => ({
      ...p,
      parentIds: p.parentIds.filter((x) => x !== id),
      spouseIds: p.spouseIds.filter((x) => x !== id),
    }))
}

/** 世代番号: 親より1つ下、配偶者とは同じ段 */
function generations(people: Person[]): Map<string, number> {
  const gen = new Map(people.map((p) => [p.id, 0]))
  const cap = people.length
  for (let iter = 0; iter < people.length * 2 + 2; iter++) {
    let changed = false
    for (const p of people) {
      let g = gen.get(p.id)!
      for (const pid of p.parentIds) {
        const pg = gen.get(pid)
        if (pg !== undefined) g = Math.max(g, pg + 1)
      }
      for (const sid of p.spouseIds) {
        const sg = gen.get(sid)
        if (sg !== undefined) g = Math.max(g, sg)
      }
      g = Math.min(g, cap)
      if (g !== gen.get(p.id)) {
        gen.set(p.id, g)
        changed = true
      }
    }
    if (!changed) break
  }
  return gen
}

export function layoutTree(people: Person[]): Layout {
  const byId = indexById(people)
  const gen = generations(people)
  const order = new Map(people.map((p, i) => [p.id, i]))
  const pos = new Map<string, { x: number; y: number }>()
  const maxGen = Math.max(0, ...gen.values())

  for (let g = 0; g <= maxGen; g++) {
    const row = people.filter((p) => gen.get(p.id) === g)
    if (row.length === 0) continue
    const y = PAD + g * (BOX_H + V_GAP)

    // 配偶者でつながる人を1つの単位にまとめる
    const seen = new Set<string>()
    const units: Person[][] = []
    for (const p of row) {
      if (seen.has(p.id)) continue
      const unit: Person[] = []
      const stack = [p]
      seen.add(p.id)
      while (stack.length > 0) {
        const cur = stack.pop()!
        unit.push(cur)
        for (const sid of cur.spouseIds) {
          const s = byId.get(sid)
          if (s && gen.get(sid) === g && !seen.has(sid)) {
            seen.add(sid)
            stack.push(s)
          }
        }
      }
      units.push(unit)
    }

    // 親が配置済みの人は親の中心を目標にする
    const parentCenter = (p: Person): number | undefined => {
      const xs = p.parentIds.map((id) => pos.get(id)).filter((v) => v !== undefined)
      if (xs.length === 0) return undefined
      return xs.reduce((a, v) => a + v.x + BOX_W / 2, 0) / xs.length
    }

    type Group = { key: string; center?: number; idx: number; units: Person[][] }
    const groups = new Map<string, Group>()
    for (const unit of units) {
      // 血縁側（親がいる人）を先に、婚姻で入った人を後ろに並べる
      unit.sort((a, b) => {
        const ca = parentCenter(a)
        const cb = parentCenter(b)
        if (ca !== undefined && cb !== undefined) return ca - cb
        if (ca !== undefined) return -1
        if (cb !== undefined) return 1
        return order.get(a.id)! - order.get(b.id)!
      })
      const blood = unit.find((p) => parentCenter(p) !== undefined)
      const key = blood ? [...blood.parentIds].sort().join('|') : `solo:${unit[0].id}`
      const idx = Math.min(...unit.map((p) => order.get(p.id)!))
      const group = groups.get(key) ?? { key, center: blood ? parentCenter(blood) : undefined, idx, units: [] }
      group.idx = Math.min(group.idx, idx)
      group.units.push(unit)
      groups.set(key, group)
    }

    const sorted = [...groups.values()].sort((a, b) => {
      if (a.center !== undefined && b.center !== undefined) return a.center - b.center || a.idx - b.idx
      if (a.center !== undefined) return -1
      if (b.center !== undefined) return 1
      return a.idx - b.idx
    })

    let cursor = PAD
    for (const group of sorted) {
      group.units.sort((a, b) => order.get(a[0].id)! - order.get(b[0].id)!)
      const unitWidths = group.units.map((u) => u.length * BOX_W + (u.length - 1) * H_GAP)
      const width = unitWidths.reduce((a, w) => a + w, 0) + (group.units.length - 1) * UNIT_GAP
      const desired = group.center !== undefined ? group.center - width / 2 : cursor
      let x = Math.max(cursor, desired)
      for (const unit of group.units) {
        for (const p of unit) {
          pos.set(p.id, { x, y })
          x += BOX_W + H_GAP
        }
        x += UNIT_GAP - H_GAP
      }
      cursor = x + 16
    }
  }

  const nodes: Placed[] = people.map((p) => ({ person: p, gen: gen.get(p.id)!, ...pos.get(p.id)! }))
  const edges: Edge[] = []

  // 夫婦線
  const done = new Set<string>()
  for (const p of people) {
    for (const sid of p.spouseIds) {
      const key = [p.id, sid].sort().join('|')
      if (done.has(key)) continue
      done.add(key)
      const a = pos.get(p.id)
      const b = pos.get(sid)
      if (!a || !b) continue
      const [l, r] = a.x <= b.x ? [a, b] : [b, a]
      const cy = l.y + BOX_H / 2
      if (adjacent(l, r) && l.y === r.y) {
        edges.push({ key: `s:${key}`, kind: 'spouse', d: `M${l.x + BOX_W} ${cy} H${r.x}` })
      } else {
        const top = Math.min(l.y, r.y) - 18
        edges.push({
          key: `s:${key}`,
          kind: 'spouse',
          d: `M${l.x + BOX_W / 2} ${l.y} C${l.x + BOX_W / 2} ${top} ${r.x + BOX_W / 2} ${top} ${r.x + BOX_W / 2} ${r.y}`,
        })
      }
    }
  }

  // 親子線: 同じ親の組の子をまとめて1本のバスでつなぐ
  const sibGroups = new Map<string, Person[]>()
  for (const p of people) {
    if (p.parentIds.length === 0) continue
    const key = [...p.parentIds].sort().join('|')
    sibGroups.set(key, [...(sibGroups.get(key) ?? []), p])
  }
  type Bus = { key: string; midX: number; startY: number; childTop: number; minX: number; maxX: number; kids: { x: number; y: number }[]; lane: number }
  const buses: Bus[] = []
  for (const [key, kids] of sibGroups) {
    const parents = key.split('|').map((id) => pos.get(id)).filter((v) => v !== undefined)
    if (parents.length === 0) continue
    const midX = parents.reduce((a, v) => a + v.x + BOX_W / 2, 0) / parents.length
    let startY = Math.max(...parents.map((v) => v.y)) + BOX_H
    const [pa, pb] = key.split('|')
    const married = pb !== undefined && (byId.get(pa)?.spouseIds.includes(pb) ?? false)
    if (married && parents.length === 2 && parents[0].y === parents[1].y && adjacent(parents[0], parents[1])) {
      startY = parents[0].y + BOX_H / 2
    }
    const kidPos = kids.map((k) => pos.get(k.id)).filter((v) => v !== undefined)
    const xs = kidPos.map((v) => v.x + BOX_W / 2)
    buses.push({
      key,
      midX,
      startY,
      childTop: Math.min(...kidPos.map((v) => v.y)),
      minX: Math.min(midX, ...xs),
      maxX: Math.max(midX, ...xs),
      kids: kidPos,
      lane: 0,
    })
  }
  // 同じ段で横に重なるバスは高さをずらし、どの親の子かを読み違えないようにする
  const LANE_STEP = 14
  for (const top of new Set(buses.map((b) => b.childTop))) {
    const row = buses.filter((b) => b.childTop === top).sort((a, b) => a.minX - b.minX)
    const laneEnds: number[] = []
    for (const bus of row) {
      let lane = laneEnds.findIndex((end) => end < bus.minX - 4)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = bus.maxX
      bus.lane = lane
    }
    const lanes = Math.min(laneEnds.length, Math.floor((V_GAP - 24) / LANE_STEP))
    for (const bus of row) bus.lane = (Math.min(bus.lane, lanes - 1) - (lanes - 1) / 2) * LANE_STEP
  }
  for (const bus of buses) {
    const busY = bus.childTop - V_GAP / 2 + bus.lane
    let d = `M${bus.midX} ${bus.startY} V${busY} M${bus.minX} ${busY} H${bus.maxX}`
    for (const v of bus.kids) d += ` M${v.x + BOX_W / 2} ${busY} V${v.y}`
    edges.push({ key: `c:${bus.key}`, kind: 'child', d })
  }

  const width = Math.max(0, ...nodes.map((n) => n.x + BOX_W)) + PAD
  const height = Math.max(0, ...nodes.map((n) => n.y + BOX_H)) + PAD
  return { nodes, edges, width, height }
}

function adjacent(a: { x: number }, b: { x: number }): boolean {
  return Math.abs(a.x - b.x) <= BOX_W + H_GAP + 1
}

export function lifespan(p: Person): string {
  if (!p.birth && !p.death) return ''
  return `${p.birth ?? '?'}〜${p.death ?? ''}`
}

/** JSON 読み込み。形が合わない要素は捨てる */
export function parseImport(text: string): Person[] {
  const raw: unknown = JSON.parse(text)
  const list = Array.isArray(raw) ? raw : (raw as { people?: unknown })?.people
  if (!Array.isArray(list)) throw new Error('people 配列が見つかりません')
  const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined)
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  const people: Person[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const id = str(o.id)
    const name = str(o.name)
    if (!id || !name) continue
    const gender: Gender = o.gender === 'male' || o.gender === 'female' ? o.gender : 'other'
    people.push({
      id,
      name,
      gender,
      birth: str(o.birth),
      death: str(o.death),
      note: str(o.note),
      parentIds: arr(o.parentIds),
      spouseIds: arr(o.spouseIds),
    })
  }
  return normalize(people)
}

export function samplePeople(): Person[] {
  const p = (
    id: string,
    name: string,
    gender: Gender,
    birth?: string,
    death?: string,
    parentIds: string[] = [],
    spouseIds: string[] = [],
    note?: string,
  ): Person => ({ id, name, gender, birth, death, parentIds, spouseIds, note })
  return normalize([
    p('taro', '山田 太郎', 'male', '1940', '2015', [], ['hanako'], '米農家'),
    p('hanako', '山田 花子', 'female', '1943'),
    p('ken', '佐藤 健', 'male', '1942', '2020', [], ['kazuko']),
    p('kazuko', '佐藤 和子', 'female', '1945'),
    p('ichiro', '山田 一郎', 'male', '1968', undefined, ['taro', 'hanako'], ['misaki']),
    p('yumi', '鈴木 由美', 'female', '1971', undefined, ['taro', 'hanako'], ['daisuke']),
    p('misaki', '山田 美咲', 'female', '1970', undefined, ['ken', 'kazuko']),
    p('daisuke', '鈴木 大輔', 'male', '1969'),
    p('shota', '山田 翔太', 'male', '1996', undefined, ['ichiro', 'misaki']),
    p('sakura', '山田 さくら', 'female', '1999', undefined, ['ichiro', 'misaki']),
    p('hina', '鈴木 陽菜', 'female', '2002', undefined, ['yumi', 'daisuke']),
  ])
}
