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

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // 前の確認がまだ未解決なら、上書きで待ちっぱなしにならないよう先にキャンセル扱いで解決する。
      setPending((prev) => {
        prev?.resolve(false)
        return { ...options, resolve }
      })
    })
  }, [])

  const close = (result: boolean) => {
    pending?.resolve(result)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal.Backdrop isOpen={pending !== null} onOpenChange={(open) => { if (!open) close(false) }}>
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
