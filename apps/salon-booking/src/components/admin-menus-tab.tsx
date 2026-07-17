import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { MENU_CATEGORIES, formatPrice } from '../../convex/lib'

const DURATION_OPTIONS = Array.from({ length: 8 }, (_, i) => (i + 1) * 30).map((m) => ({
  value: String(m),
  label: `${m}分`,
}))

type MenuFormState = {
  name: string
  description: string
  category: string
  price: number
  durationMinutes: number
}

const EMPTY_FORM: MenuFormState = {
  name: '',
  description: '',
  category: MENU_CATEGORIES[0],
  price: 0,
  durationMinutes: 60,
}

export function AdminMenusTab() {
  const { data: menus } = useSuspenseQuery(convexQuery(api.menus.listAll, {}))
  const createMenu = useMutation(api.menus.create)
  const updateMenu = useMutation(api.menus.update)
  const removeMenu = useMutation(api.menus.remove)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'menus'> | null>(null)
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Doc<'menus'> | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  function openCreateModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(menu: Doc<'menus'>) {
    setEditingId(menu._id)
    setForm({
      name: menu.name,
      description: menu.description,
      category: menu.category,
      price: menu.price,
      durationMinutes: menu.durationMinutes,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const existing = menus.find((m) => m._id === editingId)
        await updateMenu({
          id: editingId,
          ...form,
          active: existing?.active ?? true,
        })
      } else {
        await createMenu(form)
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : '保存に失敗しました。時間をおいてお試しください。',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(menu: Doc<'menus'>) {
    setListError(null)
    try {
      await updateMenu({
        id: menu._id,
        name: menu.name,
        description: menu.description,
        category: menu.category,
        price: menu.price,
        durationMinutes: menu.durationMinutes,
        active: !menu.active,
      })
    } catch (err) {
      setListError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : '更新に失敗しました。時間をおいてお試しください。',
      )
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }
    setListError(null)
    try {
      await removeMenu({ id: deleteTarget._id })
      setDeleteTarget(null)
    } catch (err) {
      setListError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : '削除に失敗しました。時間をおいてお試しください。',
      )
    }
  }

  const nameTrimmed = form.name.trim()
  const descriptionTrimmed = form.description.trim()
  const canSubmit =
    nameTrimmed.length >= 1 &&
    nameTrimmed.length <= 50 &&
    descriptionTrimmed.length <= 200 &&
    Number.isInteger(form.price) &&
    form.price >= 0 &&
    form.price <= 99999 &&
    Number.isInteger(form.durationMinutes) &&
    form.durationMinutes % 30 === 0 &&
    form.durationMinutes >= 30 &&
    form.durationMinutes <= 240

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>メニュー一覧</Title>
        <Button onClick={openCreateModal}>新規メニュー追加</Button>
      </Group>

      {listError && (
        <Alert color="red" variant="light" onClose={() => setListError(null)} withCloseButton>
          {listError}
        </Alert>
      )}

      {menus.length === 0 ? (
        <Text c="dimmed">メニューがまだ登録されていません。</Text>
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>名前</Table.Th>
                <Table.Th>カテゴリ</Table.Th>
                <Table.Th>価格</Table.Th>
                <Table.Th>所要時間</Table.Th>
                <Table.Th>公開</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {menus.map((menu) => (
                <Table.Tr key={menu._id}>
                  <Table.Td>{menu.name}</Table.Td>
                  <Table.Td>
                    <Badge color="orange" variant="light">
                      {menu.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatPrice(menu.price)}</Table.Td>
                  <Table.Td>{menu.durationMinutes}分</Table.Td>
                  <Table.Td>
                    <Switch checked={menu.active} onChange={() => handleToggleActive(menu)} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" variant="default" onClick={() => openEditModal(menu)}>
                        編集
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => setDeleteTarget(menu)}
                      >
                        削除
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'メニューを編集' : '新規メニュー追加'}
      >
        <Stack gap="sm">
          <TextInput
            label="名前"
            required
            maxLength={50}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
          />
          <Select
            label="カテゴリ"
            required
            data={[...MENU_CATEGORIES]}
            value={form.category}
            onChange={(value) => value && setForm((f) => ({ ...f, category: value }))}
          />
          <NumberInput
            label="価格（円）"
            required
            min={0}
            max={99999}
            step={100}
            value={form.price}
            onChange={(value) => setForm((f) => ({ ...f, price: typeof value === 'number' ? value : 0 }))}
          />
          <Select
            label="所要時間"
            required
            data={DURATION_OPTIONS}
            value={String(form.durationMinutes)}
            onChange={(value) =>
              value && setForm((f) => ({ ...f, durationMinutes: Number(value) }))
            }
          />
          <Textarea
            label="説明"
            maxLength={200}
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.currentTarget.value }))}
          />
          {formError && (
            <Alert color="red" variant="light">
              {formError}
            </Alert>
          )}
          <Button loading={submitting} disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {editingId ? '更新する' : '追加する'}
          </Button>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="メニューの削除">
        <Stack gap="sm">
          <Text>「{deleteTarget?.name}」を削除しますか？</Text>
          <Text size="sm" c="dimmed">
            予約履歴の表示には影響しません。
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button color="red" onClick={handleDelete}>
              削除する
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
