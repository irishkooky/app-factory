import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import {
  Alert,
  Avatar,
  Button,
  ColorSwatch,
  Group,
  Modal,
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
import { AVATAR_COLORS } from '../../convex/lib'

type StylistFormState = {
  name: string
  role: string
  bio: string
  avatarColor: string
}

const EMPTY_FORM: StylistFormState = {
  name: '',
  role: '',
  bio: '',
  avatarColor: AVATAR_COLORS[0],
}

function ColorOptionLabel({ color, label }: { color: string; label: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ColorSwatch color={`var(--mantine-color-${color}-6)`} size={16} />
      <Text size="sm">{label}</Text>
    </Group>
  )
}

export function AdminStylistsTab() {
  const { data: stylists } = useSuspenseQuery(convexQuery(api.stylists.listAll, {}))
  const createStylist = useMutation(api.stylists.create)
  const updateStylist = useMutation(api.stylists.update)
  const removeStylist = useMutation(api.stylists.remove)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'stylists'> | null>(null)
  const [form, setForm] = useState<StylistFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Doc<'stylists'> | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  function openCreateModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(stylist: Doc<'stylists'>) {
    setEditingId(stylist._id)
    setForm({
      name: stylist.name,
      role: stylist.role,
      bio: stylist.bio,
      avatarColor: stylist.avatarColor,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const existing = stylists.find((s) => s._id === editingId)
        await updateStylist({
          id: editingId,
          ...form,
          active: existing?.active ?? true,
        })
      } else {
        await createStylist(form)
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

  async function handleToggleActive(stylist: Doc<'stylists'>) {
    setListError(null)
    try {
      await updateStylist({
        id: stylist._id,
        name: stylist.name,
        role: stylist.role,
        bio: stylist.bio,
        avatarColor: stylist.avatarColor,
        active: !stylist.active,
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
      await removeStylist({ id: deleteTarget._id })
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
  const roleTrimmed = form.role.trim()
  const bioTrimmed = form.bio.trim()
  const canSubmit =
    nameTrimmed.length >= 1 &&
    nameTrimmed.length <= 30 &&
    roleTrimmed.length <= 50 &&
    bioTrimmed.length <= 200

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>スタイリスト一覧</Title>
        <Button onClick={openCreateModal}>新規スタイリスト追加</Button>
      </Group>

      {listError && (
        <Alert color="red" variant="light" onClose={() => setListError(null)} withCloseButton>
          {listError}
        </Alert>
      )}

      {stylists.length === 0 ? (
        <Text c="dimmed">スタイリストがまだ登録されていません。</Text>
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>名前</Table.Th>
                <Table.Th>役職</Table.Th>
                <Table.Th>紹介文</Table.Th>
                <Table.Th>公開</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stylists.map((stylist) => (
                <Table.Tr key={stylist._id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar color={stylist.avatarColor} radius="xl" size={32}>
                        {stylist.name.slice(0, 1)}
                      </Avatar>
                      <Text>{stylist.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{stylist.role}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1} maw={280}>
                      {stylist.bio}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Switch checked={stylist.active} onChange={() => handleToggleActive(stylist)} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" variant="default" onClick={() => openEditModal(stylist)}>
                        編集
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => setDeleteTarget(stylist)}
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
        title={editingId ? 'スタイリストを編集' : '新規スタイリスト追加'}
      >
        <Stack gap="sm">
          <TextInput
            label="名前"
            required
            maxLength={30}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
          />
          <TextInput
            label="役職"
            placeholder="例: 店長 / トップスタイリスト"
            maxLength={50}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.currentTarget.value }))}
          />
          <Select
            label="アバターカラー"
            required
            data={AVATAR_COLORS.map((color) => ({ value: color, label: color }))}
            value={form.avatarColor}
            onChange={(value) => value && setForm((f) => ({ ...f, avatarColor: value }))}
            renderOption={({ option }) => (
              <ColorOptionLabel color={option.value} label={option.label} />
            )}
          />
          <Textarea
            label="紹介文"
            maxLength={200}
            rows={3}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.currentTarget.value }))}
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

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="スタイリストの削除">
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
