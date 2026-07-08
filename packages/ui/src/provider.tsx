import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { theme } from './theme'

export interface AppProviderProps {
  /** Application UI tree */
  children?: ReactNode
}

/**
 * Root provider that applies the shared app-factory Mantine theme
 * (indigo primary, md radius, Inter font stack). Wrap the whole app in it.
 */
export function AppProvider({ children }: AppProviderProps) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>
}
