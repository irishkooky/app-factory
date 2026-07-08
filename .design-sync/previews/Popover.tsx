import { Button, Popover, Stack, TextInput } from '@app-factory/ui'

export const QuickAdd = () => (
  <Popover opened withinPortal={false} transitionProps={{ duration: 0 }}>
    <Popover.Target>
      <Button>タグを追加</Button>
    </Popover.Target>
    <Popover.Dropdown>
      <Stack gap="sm">
        <TextInput label="タグ名" placeholder="例: 重要" />
        <Button size="sm">追加する</Button>
      </Stack>
    </Popover.Dropdown>
  </Popover>
)
