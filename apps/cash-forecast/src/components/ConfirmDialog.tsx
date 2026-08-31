import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button, Modal } from '@heroui/react'

type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
}

type PendingConfirm = ConfirmOptions & { resolve: (result: boolean) => void }

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // 前の確認がまだ未解決なら、上書きで待ちっぱなしにならないよう先にキャンセル扱いで解決する。
      setPending((prev) => {
        prev?.resolve(false)
        return { ...options, resolve }
      })
      setIsOpen(true)
    })
  }, [])

  const close = (result: boolean) => {
    // resolve は Promise の仕様上、複数回呼んでも2回目以降は無視されるだけなので冪等。
    // ここで二重に呼ばれても問題ない。
    pending?.resolve(result)
    // pending はここで null にしない: Modal.Backdrop の isOpen が false になった直後に
    // 中身の Modal.Container ごと unmount すると、react-aria の useExitAnimation が
    // ref.current === null のまま完了コールバックを呼べず、isExiting が true に固定されて
    // バックドロップ（暗転）がDOMに残り続けてしまう。isOpen だけ落として exit アニメーションを
    // 完走させ、pending 自体は次の confirm() 呼び出しまで保持する。
    setIsOpen(false)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) close(false) }}>
        {pending && (
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.Header>
                <Modal.Heading>{pending.title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">{pending.description}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => close(false)}>
                  {pending.cancelLabel ?? 'キャンセル'}
                </Button>
                <Button variant={pending.isDestructive ? 'danger' : 'primary'} onPress={() => close(true)}>
                  {pending.confirmLabel ?? '確認'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        )}
      </Modal.Backdrop>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider')
  return ctx
}
