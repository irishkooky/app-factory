import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

const DEFAULT_EMAIL = 'cash-forecast-e2e+clerk_test@example.com'

setup.describe.configure({ mode: 'serial' })

setup('clerkSetup + env gate', async () => {
  const missing: string[] = []
  if (!process.env.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY')
  if (!process.env.CLERK_PUBLISHABLE_KEY) missing.push('CLERK_PUBLISHABLE_KEY')
  if (!process.env.E2E_CLERK_USER_EMAIL) {
    process.env.E2E_CLERK_USER_EMAIL = DEFAULT_EMAIL
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing secrets for Clerk E2E: ${missing.join(', ')}. ` +
        `Also set E2E_CLERK_USER_EMAIL (default ${DEFAULT_EMAIL}). ` +
        `Add them to Cloud Agent Secrets / the environment; do not scrape keys from production.`,
    )
  }

  await clerkSetup()
})
