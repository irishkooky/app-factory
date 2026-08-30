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
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* OSのカラースキームを描画前に data-theme へ反映する（FOUC防止のため head 内の同期スクリプト）。
            OS設定の変更にも追従する。 */}
        <script
          // eslint的にはdangerouslySetInnerHTMLだが、静的文字列のみでユーザー入力は含まない
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var m=window.matchMedia('(prefers-color-scheme: dark)');var f=function(){document.documentElement.setAttribute('data-theme',m.matches?'dark':'light')};f();m.addEventListener('change',f)})()",
          }}
        />
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
