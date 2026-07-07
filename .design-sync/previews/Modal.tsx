import { Button, Group, Modal, Text } from '@app-factory/ui'

export const Confirm = () => (
  <Modal
    opened
    onClose={() => {}}
    title="予約を削除しますか？"
    withinPortal={false}
    transitionProps={{ duration: 0 }}
  >
    <Text size="sm" mb="lg">
      この操作は取り消せません。削除すると予約データは完全に失われます。
    </Text>
    <Group justify="flex-end">
      <Button variant="default">キャンセル</Button>
      <Button color="red">削除する</Button>
    </Group>
  </Modal>
)
