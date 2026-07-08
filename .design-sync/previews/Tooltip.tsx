import { Button, Tooltip } from '@app-factory/ui'

export const Basic = () => (
  <Tooltip
    label="この操作は元に戻せません"
    opened
    withinPortal={false}
    transitionProps={{ duration: 0 }}
  >
    <Button color="red">アカウントを削除</Button>
  </Tooltip>
)
