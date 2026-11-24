import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(root, '..')
const devPort = 5124
const baseURL = process.env.E2E_BASE_URL?.replace(/\/$/, '') ?? `http://127.0.0.1:${devPort}`

export default defineConfig({
  testDir: root,
  testMatch: /reparent-ux-real\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 180_000,
  expect: { timeout: 45_000 },
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: /reparent-ux-real\.spec\.ts/,
    },
  ],
  webServer: {
    command: `vp exec vite dev --port ${devPort} --host 127.0.0.1`,
    cwd: appRoot,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
})