import { clerk } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const artifactsDir = path.join(root, 'artifacts')
/** Project store media path (Cloud Agent / coordinator artifacts). */
const storeMediaDir = '/cursor/stores/self/media/clerk-e2e'

const email =
  process.env.E2E_CLERK_USER_EMAIL ?? 'cash-forecast-e2e+clerk_test@example.com'

function saveShot(localName: string, pageShotPath: string) {
  mkdirSync(artifactsDir, { recursive: true })
  mkdirSync(storeMediaDir, { recursive: true })
  const localDest = path.join(artifactsDir, localName)
  const storeDest = path.join(storeMediaDir, localName)
  copyFileSync(pageShotPath, localDest)
  copyFileSync(pageShotPath, storeDest)
  return { localDest, storeDest }
}

test.describe('Clerk authenticated shell', () => {
  test('sign in via emailAddress and capture logged-in UI', async ({ page }) => {
    // Unprotected page that loads Clerk (required before clerk.signIn).
    await page.goto('/')
    await clerk.loaded({ page })

    await clerk.signIn({
      page,
      emailAddress: email,
    })

    // Reload so ConvexProviderWithClerk picks up the session.
    await page.goto('/')
    await clerk.loaded({ page })

    // Leave the public unauthenticated CTA.
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toHaveCount(0, {
      timeout: 45_000,
    })

    // Either onboarding (new test user) or the forecast shell.
    const onboarding = page.getByText('初期設定', { exact: false })
    const forecastTitle = page.getByRole('heading', { name: '残高予測' })
    const userButton = page.locator('.cl-userButtonTrigger, [data-clerk-component="UserButton"]')

    await expect
      .poll(async () => {
        const hasOnboarding = await onboarding.count()
        const hasForecast = await forecastTitle.count()
        const hasUser = await userButton.count()
        return hasOnboarding + hasForecast + hasUser > 0
      }, { timeout: 45_000 })
      .toBe(true)

    const tmp = path.join(artifactsDir, '_tmp-authenticated.png')
    mkdirSync(artifactsDir, { recursive: true })
    await page.screenshot({ path: tmp, fullPage: true })
    const { localDest, storeDest } = saveShot('01-authenticated-shell.png', tmp)
    console.log(`screenshot: ${localDest}`)
    console.log(`screenshot: ${storeDest}`)

    // Best-effort: open menu / look for Pro-gated or checkpoint UI without failing the suite.
    const menu = page.getByRole('button', { name: /メニュー|menu/i }).or(
      page.locator('button').filter({ has: page.locator('svg') }).first(),
    )
    if ((await menu.count()) > 0) {
      try {
        await menu.first().click({ timeout: 5_000 })
        await page.waitForTimeout(500)
        const tmp2 = path.join(artifactsDir, '_tmp-menu.png')
        await page.screenshot({ path: tmp2, fullPage: true })
        saveShot('02-authenticated-menu.png', tmp2)
      } catch {
        // Menu affordance varies; shell shot is enough proof of auth.
      }
    }

    // Record what we proved for the coordinator.
    const bodyText = (await page.locator('body').innerText()).slice(0, 2000)
    const proved = {
      email,
      baseURL: test.info().project.use.baseURL,
      sawGoogleCta: false,
      bodyPreview: bodyText,
      notes: bodyText.includes('Pro')
        ? 'Pro badge/gate text visible (plan may still block some panels).'
        : 'Signed-in shell captured; Pro/checkpoint UI may be gated or absent for this user.',
    }
    const { writeFileSync } = await import('node:fs')
    writeFileSync(
      path.join(artifactsDir, 'verified.json'),
      JSON.stringify(proved, null, 2) + '\n',
    )
    writeFileSync(
      path.join(storeMediaDir, 'verified.json'),
      JSON.stringify(proved, null, 2) + '\n',
    )
  })
})
