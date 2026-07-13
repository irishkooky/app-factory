import { Button, Drawer, Separator } from '@heroui/react'
import { BillingButton } from './BillingControls'

type MenuDrawerProps = {
  opened: boolean
  onClose: () => void
  onReconcile: () => void
  onRules: () => void
  onThreshold: () => void
  onMonthlySummary: () => void
}

export function MenuDrawer({ opened, onClose, onReconcile, onRules, onThreshold, onMonthlySummary }: MenuDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={opened} onOpenChange={(open) => { if (!open) onClose() }}>
      <Drawer.Content placement="right">
        <Drawer.Dialog>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>メニュー</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onPress={onReconcile}>残高を合わせる</Button>
              <Button variant="secondary" onPress={onRules}>ルール管理</Button>
              <Button variant="secondary" onPress={onThreshold}>しきい値</Button>
              <Button variant="secondary" onPress={onMonthlySummary}>月次サマリー</Button>
              <Separator className="my-1" />
              <BillingButton variant="secondary" />
            </div>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
