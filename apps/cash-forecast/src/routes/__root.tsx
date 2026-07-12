import '../styles.css'

import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { Toast } from '@heroui/react'
import { ConfirmDialogProvider } from '../components/ConfirmDialog'
import { notifyQueue } from '../lib/notify'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: '残高予測',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <ConfirmDialogProvider>
          <Toast.Provider placement="top" queue={notifyQueue} />
          {children}
        </ConfirmDialogProvider>
        <Scripts />
      </body>
    </html>
  )
}
