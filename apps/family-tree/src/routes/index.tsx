import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  FileButton,
  Group,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  BOX_H,
  BOX_W,
  type Gender,
  type Person,
  childrenOf,
  descendantsOf,
  layoutTree,
  lifespan,
  newId,
  normalize,
  parseImport,
  removePerson,
  samplePeople,
} from '../lib/tree'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: '家系図メーカー' }] }),
  component: HomeComponent,
})

const STORAGE_KEY = 'family-tree:v1'

const GENDER_COLORS: Record<Gender, { fill: string; stroke: string }> = {
  male: { fill: '#e7f0ff', stroke: '#4c6ef5' },
  female: { fill: '#ffeef4', stroke: '#e64980' },
  other: { fill: '#f1f3f5', stroke: '#868e96' },
}

const GENDER_LABELS: Record<Gender, string> = { male: '男性', female: '女性', other: 'その他' }

function loadStored(): Person[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? parseImport(raw) : null
  } catch {
    return null
  }
}

function HomeComponent() {
  const [people, setPeople] = useState<Person[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [confirmClear, setConfirmClear] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setPeople(loadStored() ?? samplePeople())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, people }))
    } catch {
      // 保存できない環境（プライベートモードなど）でも表示は続ける
    }
  }, [people, loaded])

  const layout = useMemo(() => layoutTree(people), [people])
  const selected = people.find((p) => p.id === selectedId) ?? null

  const update = (next: Person[]) => setPeople(normalize(next))

  const addPerson = (init: Partial<Person>, link?: (id: string, list: Person[]) => Person[]) => {
    const id = newId()
    const person: Person = { id, name: '新しい人', gender: 'other', parentIds: [], spouseIds: [], ...init }
    let next = [...people, person]
    if (link) next = link(id, next)
    update(next)
    setSelectedId(id)
  }

  const patchPerson = (id: string, patch: Partial<Person>) => {
    update(people.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const setSpouses = (id: string, spouseIds: string[]) => {
    // 配偶者は双方向なので、外した相手の側からも消す
    update(
      people.map((p) => {
        if (p.id === id) return { ...p, spouseIds }
        const linked = spouseIds.includes(p.id)
        const has = p.spouseIds.includes(id)
        if (linked && !has) return { ...p, spouseIds: [...p.spouseIds, id] }
        if (!linked && has) return { ...p, spouseIds: p.spouseIds.filter((x) => x !== id) }
        return p
      }),
    )
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, people }, null, 2)], { type: 'application/json' })
    download(blob, 'family-tree.json')
  }

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(layout.width))
    clone.setAttribute('height', String(layout.height))
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    download(blob, 'family-tree.svg')
  }

  const importJson = async (file: File | null) => {
    if (!file) return
    try {
      const next = parseImport(await file.text())
      setPeople(next)
      setSelectedId(null)
      setImportError(null)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '読み込みに失敗しました')
    }
  }

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      <Box px="md" py="sm" style={{ background: 'white', borderBottom: '1px solid #e9ecef' }}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Title order={3}>家系図メーカー</Title>
            <Badge variant="light" tt="none">
              {people.length}人
            </Badge>
          </Group>
          <Group gap="xs" wrap="wrap">
            <Button size="xs" onClick={() => addPerson({})}>
              人物を追加
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button size="xs" variant="default">
                  ファイル
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={exportJson}>JSON で書き出す</Menu.Item>
                <FileButton onChange={importJson} accept="application/json,.json">
                  {(props) => <Menu.Item {...props}>JSON を読み込む</Menu.Item>}
                </FileButton>
                <Menu.Item onClick={exportSvg} disabled={people.length === 0}>
                  画像（SVG）で保存
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={() => update(samplePeople())}>サンプルを表示</Menu.Item>
                <Menu.Item color="red" onClick={() => setConfirmClear(true)}>
                  すべて消して新しく作る
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Group gap={6} w={150} wrap="nowrap">
              <Text size="xs" c="dimmed">
                拡大
              </Text>
              <Slider
                flex={1}
                size="sm"
                min={0.4}
                max={1.6}
                step={0.1}
                value={zoom}
                onChange={setZoom}
                label={(v) => `${Math.round(v * 100)}%`}
              />
            </Group>
          </Group>
        </Group>
        {importError && (
          <Text size="sm" c="red" mt={4}>
            読み込みエラー: {importError}
          </Text>
        )}
      </Box>

      <Box style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {!loaded ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : people.length === 0 ? (
          <Stack align="center" py={80} gap="md">
            <Text c="dimmed">まだ誰もいません。最初の人物を追加しましょう。</Text>
            <Button onClick={() => addPerson({ name: '自分' })}>自分を追加</Button>
          </Stack>
        ) : (
          <svg
            ref={svgRef}
            width={layout.width * zoom}
            height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{ display: 'block', margin: '0 auto' }}
            onClick={() => setSelectedId(null)}
          >
            <rect width={layout.width} height={layout.height} fill="#f8f9fa" />
            {layout.edges.map((e) => (
              <path
                key={e.key}
                d={e.d}
                fill="none"
                stroke={e.kind === 'spouse' ? '#e8590c' : '#495057'}
                strokeWidth={e.kind === 'spouse' ? 2.5 : 1.6}
              />
            ))}
            {layout.nodes.map(({ person, x, y }) => {
              const c = GENDER_COLORS[person.gender]
              const isSel = person.id === selectedId
              const life = lifespan(person)
              return (
                <g
                  key={person.id}
                  transform={`translate(${x} ${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setSelectedId(person.id)
                  }}
                >
                  <rect
                    width={BOX_W}
                    height={BOX_H}
                    rx={10}
                    fill={c.fill}
                    stroke={isSel ? '#212529' : c.stroke}
                    strokeWidth={isSel ? 3 : 1.5}
                    strokeDasharray={person.death ? '5 3' : undefined}
                  />
                  <text
                    x={BOX_W / 2}
                    y={life ? 28 : 37}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill="#212529"
                    fontFamily="'Hiragino Sans', sans-serif"
                  >
                    {truncate(person.name, 10)}
                  </text>
                  {life && (
                    <text
                      x={BOX_W / 2}
                      y={48}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#495057"
                      fontFamily="'Hiragino Sans', sans-serif"
                    >
                      {life}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </Box>

      <Box px="md" py={6} style={{ background: 'white', borderTop: '1px solid #e9ecef' }}>
        <Text size="xs" c="dimmed">
          人物をクリックすると編集できます。点線の枠は故人、オレンジの線は夫婦。データはこのブラウザにだけ保存されます（JSON で書き出してバックアップできます）。
        </Text>
      </Box>

      <Drawer
        opened={selected !== null}
        onClose={() => setSelectedId(null)}
        position="right"
        size="sm"
        title={<Text fw={700}>人物を編集</Text>}
      >
        {selected && (
          <PersonEditor
            key={selected.id}
            person={selected}
            people={people}
            onPatch={(patch) => patchPerson(selected.id, patch)}
            onSpouses={(ids) => setSpouses(selected.id, ids)}
            onSelect={setSelectedId}
            onAddChild={() =>
              addPerson({
                name: '子',
                parentIds: [selected.id, ...(selected.spouseIds.length === 1 ? selected.spouseIds : [])],
              })
            }
            onAddParent={() =>
              addPerson(
                // 片親がいれば新しい親と夫婦にする
                { name: '親', spouseIds: selected.parentIds.slice(0, 1) },
                (id, list) => list.map((p) => (p.id === selected.id ? { ...p, parentIds: [...p.parentIds, id] } : p)),
              )
            }
            onAddSpouse={() =>
              addPerson({
                name: '配偶者',
                gender: selected.gender === 'male' ? 'female' : selected.gender === 'female' ? 'male' : 'other',
                spouseIds: [selected.id],
              })
            }
            onDelete={() => {
              update(removePerson(people, selected.id))
              setSelectedId(null)
            }}
          />
        )}
      </Drawer>

      <Modal opened={confirmClear} onClose={() => setConfirmClear(false)} title="すべて消しますか？" centered>
        <Stack>
          <Text size="sm">この家系図の人物をすべて削除します。必要なら先に JSON で書き出してください。</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmClear(false)}>
              やめる
            </Button>
            <Button
              color="red"
              onClick={() => {
                setPeople([])
                setSelectedId(null)
                setConfirmClear(false)
              }}
            >
              消す
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}

type EditorProps = {
  person: Person
  people: Person[]
  onPatch: (patch: Partial<Person>) => void
  onSpouses: (ids: string[]) => void
  onSelect: (id: string) => void
  onAddChild: () => void
  onAddParent: () => void
  onAddSpouse: () => void
  onDelete: () => void
}

function PersonEditor({
  person,
  people,
  onPatch,
  onSpouses,
  onSelect,
  onAddChild,
  onAddParent,
  onAddSpouse,
  onDelete,
}: EditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const descendants = useMemo(() => descendantsOf(people, person.id), [people, person.id])
  const others = people.filter((p) => p.id !== person.id)
  const parentOptions = others.filter((p) => !descendants.has(p.id)).map(toOption)
  const spouseOptions = others.map(toOption)
  const children = childrenOf(people, person.id)

  return (
    <Stack gap="sm">
      <TextInput
        label="名前"
        value={person.name}
        onChange={(e) => onPatch({ name: e.currentTarget.value })}
        onBlur={(e) => {
          if (e.currentTarget.value.trim() === '') onPatch({ name: '名前なし' })
        }}
      />
      <div>
        <Text size="sm" fw={500} mb={4}>
          性別
        </Text>
        <SegmentedControl
          fullWidth
          value={person.gender}
          onChange={(v) => onPatch({ gender: v as Gender })}
          data={(Object.keys(GENDER_LABELS) as Gender[]).map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
        />
      </div>
      <Group grow>
        <TextInput
          label="生年"
          placeholder="1970"
          value={person.birth ?? ''}
          onChange={(e) => onPatch({ birth: e.currentTarget.value || undefined })}
        />
        <TextInput
          label="没年"
          placeholder="存命なら空欄"
          value={person.death ?? ''}
          onChange={(e) => onPatch({ death: e.currentTarget.value || undefined })}
        />
      </Group>
      <MultiSelect
        label="親（2人まで）"
        data={parentOptions}
        value={person.parentIds}
        onChange={(ids) => onPatch({ parentIds: ids })}
        maxValues={2}
        searchable
        clearable
        placeholder={person.parentIds.length === 0 ? '選択' : undefined}
        nothingFoundMessage="該当なし"
      />
      <MultiSelect
        label="配偶者"
        data={spouseOptions}
        value={person.spouseIds}
        onChange={onSpouses}
        searchable
        clearable
        placeholder={person.spouseIds.length === 0 ? '選択' : undefined}
        nothingFoundMessage="該当なし"
      />
      <Textarea
        label="メモ"
        autosize
        minRows={2}
        value={person.note ?? ''}
        onChange={(e) => onPatch({ note: e.currentTarget.value || undefined })}
      />

      <Card withBorder padding="sm">
        <Text size="sm" fw={500} mb={6}>
          子（{children.length}人）
        </Text>
        <Group gap={6}>
          {children.length === 0 && (
            <Text size="sm" c="dimmed">
              なし
            </Text>
          )}
          {children.map((c) => (
            <Badge key={c.id} variant="light" tt="none" style={{ cursor: 'pointer' }} onClick={() => onSelect(c.id)}>
              {c.name}
            </Badge>
          ))}
        </Group>
      </Card>

      <Text size="sm" fw={500}>
        つながる人を追加
      </Text>
      <Group gap="xs" grow>
        <Tooltip label="親は2人まで" disabled={person.parentIds.length < 2}>
          <Button variant="light" size="xs" onClick={onAddParent} disabled={person.parentIds.length >= 2}>
            親
          </Button>
        </Tooltip>
        <Button variant="light" size="xs" onClick={onAddSpouse}>
          配偶者
        </Button>
        <Button variant="light" size="xs" onClick={onAddChild}>
          子
        </Button>
      </Group>

      <Group justify="space-between" mt="md">
        {confirmDelete ? (
          <Group gap="xs">
            <Text size="sm">本当に削除しますか？</Text>
            <Button color="red" size="xs" onClick={onDelete}>
              削除
            </Button>
            <Button variant="default" size="xs" onClick={() => setConfirmDelete(false)}>
              やめる
            </Button>
          </Group>
        ) : (
          <Button color="red" variant="subtle" size="xs" onClick={() => setConfirmDelete(true)}>
            この人を削除
          </Button>
        )}
      </Group>
    </Stack>
  )
}

function toOption(p: Person) {
  const life = lifespan(p)
  return { value: p.id, label: life ? `${p.name}（${life}）` : p.name }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
