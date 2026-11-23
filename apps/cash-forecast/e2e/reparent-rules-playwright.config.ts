import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  testDir: path.dirname(fileURLToPath(import.meta.url)),
  testMatch: /reparent-rules-screenshot\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:5199',
  },
  webServer: {
    command: 'vp exec vite --config e2e/reparent-rules-harness/vite.config.ts',
    cwd: appRoot,
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})