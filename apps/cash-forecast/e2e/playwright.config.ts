import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const baseURL =
  process.env.E2E_BASE_URL?.replace(/\/$/, '') ??
  'https://cash-forecast.ichigoooo.workers.dev'

/**
 * Clerk Playwright helpers require a project-based setup (not function globalSetup)
 * so CLERK_FAPI / CLERK_TESTING_TOKEN propagate to workers.
 * @see https://clerk.com/docs/guides/development/testing/playwright/overview
 */
export default defineConfig({
  testDir: root,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(root, 'playwright-report') }]],
  outputDir: path.join(root, 'test-results'),
  timeout: 90_000,
  expect: { timeout: 30_000 },
  use: {
    ...devices['Pixel 7'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: process.env.E2E_VIDEO === '1' ? 'on' : 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
    },
  ],
})
