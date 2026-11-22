import { clerk } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
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

function copyVideoIfAny(destName: string) {
  const resultsRoot = path.join(root, 'test-results')
  if (!existsSync(resultsRoot)) return null
  const walk = (dir: string): string | null => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name)
      if (name.isDirectory()) {
        const found = walk(full)
        if (found) return found
      } else if (name.name === 'video.webm') {
        return full
      }
    }
    return null
  }
  const video = walk(resultsRoot)
  if (!video) return null
  mkdirSync(storeMediaDir, { recursive: true })
  const dest = path.join(storeMediaDir, destName)
  copyFileSync(video, dest)
  copyFileSync(video, path.join(artifactsDir, destName))
  return dest
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

    // New users land on onboarding ("ようこそ"); returning users see the forecast shell.
    const onboardingHeading = page.getByRole('heading', { name: 'ようこそ' })
    const startButton = page.getByRole('button', { name: 'はじめる' })
    const forecastTitle = page.getByRole('heading', { name: '残高予測' })
    const userButton = page.locator('.cl-userButtonTrigger, [data-clerk-component="UserButton"]')

    await expect
      .poll(async () => {
        const hasOnboarding = await onboardingHeading.count()
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

    // Complete onboarding when present so we can capture the forecast shell + menu.
    if ((await onboardingHeading.count()) > 0 && (await startButton.count()) > 0) {
      await startButton.click()
      await expect(forecastTitle).toBeVisible({ timeout: 45_000 })
    }

    // Pro plan (ensure-e2e-pro) unlocks chart + forecast-check panels.
    const proBadge = page.getByText('Pro', { exact: true })
    const freeBadge = page.getByText('Free', { exact: true })
    await expect
      .poll(async () => {
        if ((await forecastTitle.count()) === 0) return 'no-forecast'
        if ((await proBadge.count()) > 0) return 'pro'
        if ((await freeBadge.count()) > 0) return 'free'
        return 'unknown'
      }, { timeout: 45_000 })
      .toBe('pro')

    // Always refresh forecast shell shot once Pro is visible (returning users skip onboarding).
    const tmpForecast = path.join(artifactsDir, '_tmp-forecast.png')
    await page.screenshot({ path: tmpForecast, fullPage: true })
    saveShot('02-forecast-shell.png', tmpForecast)
    await expect(page.getByText('予測チェックポイント')).toHaveCount(0)

    // 予測の答え合わせ lives only in the menu.
    const menu = page.getByRole('button', { name: 'メニュー' })
    await menu.click({ timeout: 5_000 })
    const forecastCheckEntry = page.getByRole('button', { name: '予測の答え合わせ' })
    await expect(forecastCheckEntry).toBeVisible()
    await page.waitForTimeout(600)
    const tmpMenu = path.join(artifactsDir, '_tmp-menu.png')
    await page.screenshot({ path: tmpMenu, fullPage: true })
    saveShot('03-authenticated-menu.png', tmpMenu)

    await forecastCheckEntry.click()
    await expect(page.getByRole('heading', { name: '予測の答え合わせ' })).toBeVisible()
    await expect(
      page.getByText(/^最初の記録は .+ です$/).or(page.getByText(/月末の残高$/)),
    ).toBeVisible()
    await page.waitForTimeout(500)
    const tmpCheck = path.join(artifactsDir, '_tmp-forecast-check.png')
    await page.screenshot({ path: tmpCheck, fullPage: true })
    saveShot('05-forecast-check-drawer.png', tmpCheck)

    const next = page.getByRole('button', { name: '次の日付' })
    if ((await next.count()) > 0 && (await next.isEnabled())) {
      await next.click()
      await page.waitForTimeout(500)
      const tmpNext = path.join(artifactsDir, '_tmp-forecast-check-next.png')
      await page.screenshot({ path: tmpNext, fullPage: true })
      saveShot('06-forecast-check-next.png', tmpNext)
    }

    // Record what we proved for the coordinator.
    const bodyText = (await page.locator('body').innerText()).slice(0, 2000)
    const isPro = (await proBadge.count()) > 0
    const proved = {
      email,
      baseURL: test.info().project.use.baseURL,
      sawGoogleCta: false,
      plan: isPro ? 'pro' : 'free',
      bodyPreview: bodyText,
      notes: isPro
        ? 'Pro plan unlocked; 予測の答え合わせ drawer captured (05, plus 06 when a next date exists).'
        : 'Signed-in shell captured but Free plan — run e2e:clerk-pro before screenshots.',
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

    // Video is attached after the test ends; copy best-effort from prior runs' outputDir mid-test
    // is unreliable — afterAll below handles the final copy.
  })

  test.afterAll(() => {
    const dest = copyVideoIfAny('04-authenticated-session.webm')
    if (dest) console.log(`video: ${dest}`)
  })
})
