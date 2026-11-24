import { clerk } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(root, '..')
const storeDir = '/cursor/stores/bc-c803f8f1-bb61-46e3-8c93-8305f25c800c/media/reparent-ux'
const artifactsDir = path.join(root, 'artifacts-reparent-ux-real')

const email =
  process.env.E2E_CLERK_USER_EMAIL ?? 'cash-forecast-e2e+clerk_test@example.com'

/** main の ReparentTargetPicker 候補リスト max-height（24rem / 55vh の小さい方 @375×812） */
const MAIN_BRANCH_CANDIDATE_SCROLL_MAX_PX = Math.min(384, Math.round(812 * 0.55))

function saveShot(fileName: string, from: string) {
  mkdirSync(artifactsDir, { recursive: true })
  mkdirSync(storeDir, { recursive: true })
  copyFileSync(from, path.join(artifactsDir, fileName))
  copyFileSync(from, path.join(storeDir, fileName))
}

async function signInForecast(page: import('@playwright/test').Page) {
  await page.goto('/')
  await clerk.loaded({ page })
  await clerk.signIn({ page, emailAddress: email })
  await page.goto('/')
  await clerk.loaded({ page })
  await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible({ timeout: 60_000 })
}

async function assertFooterSticky(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('[data-testid="reparent-picker-footer"]')
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    if (!footer || !dialog) return null
    const footerRect = footer.getBoundingClientRect()
    const dialogRect = dialog.getBoundingClientRect()
    return {
      position: getComputedStyle(footer).position,
      footerBottom: footerRect.bottom,
      dialogBottom: dialogRect.bottom,
      viewportHeight: window.innerHeight,
    }
  })
  expect(metrics).not.toBeNull()
  expect(metrics!.position).toBe('sticky')
  expect(Math.abs(metrics!.footerBottom - metrics!.dialogBottom)).toBeLessThanOrEqual(28)
  expect(metrics!.dialogBottom).toBeGreaterThanOrEqual(metrics!.viewportHeight - 4)
}

function formatMonthLabelJa(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  return `${y}年${Number(m)}月`
}

function ruleGroup(page: import('@playwright/test').Page, ruleName: string) {
  return page.locator('section[data-rule-group]').filter({
    has: page.getByRole('heading', { name: ruleName }),
  })
}

async function expandRuleGroupIfNeeded(group: import('@playwright/test').Locator) {
  const more = group.getByRole('button', { name: /もっと見る/ })
  if (await more.isVisible()) await more.click()
}

async function selectRuleMonth(
  page: import('@playwright/test').Page,
  ruleName: string,
  ruleMonth: string,
) {
  const group = ruleGroup(page, ruleName)
  await expandRuleGroupIfNeeded(group)
  await group.locator(`button[data-candidate-key$=":${ruleMonth}"]`).first().click()
}

let seedMeta: {
  targetRuleMonth: string
  moveTargetRuleMonth: string
}

test.describe('reparent UX real UI @375', () => {
  test.beforeAll(() => {
    execSync('vp run e2e:clerk-pro', { cwd: appRoot, stdio: 'inherit', env: process.env })
    const proPath = path.join(appRoot, 'e2e/artifacts/e2e-pro.json')
    const { userId } = JSON.parse(readFileSync(proPath, 'utf8')) as { userId: string }
    const out = execSync(
      `npx convex run e2eReparentUx:seed '${JSON.stringify({ clerkUserId: userId, label: 'real-ui' })}'`,
      { cwd: appRoot, encoding: 'utf8', env: process.env },
    )
    const match = out.trim().match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`convex seed output had no JSON: ${out.slice(0, 200)}`)
    seedMeta = JSON.parse(match[0]) as typeof seedMeta
    mkdirSync(artifactsDir, { recursive: true })
    writeFileSync(path.join(artifactsDir, 'reparent-ux-seed.json'), JSON.stringify(seedMeta, null, 2))
  })

  test('full reparent flow + screenshots', async ({ page }) => {
    const targetMonthLabel = formatMonthLabelJa(seedMeta.targetRuleMonth)
    const moveTargetMonthLabel = formatMonthLabelJa(seedMeta.moveTargetRuleMonth)
    await signInForecast(page)
    await page.reload()
    await expect(page.getByText(/E2E移動元/)).toBeVisible({ timeout: 30_000 })

    await page.getByText(/E2E移動元/).click()
    await expect(page.getByRole('heading', { name: '取引を編集' })).toBeVisible()
    await page.getByRole('button', { name: '別の取引へ移動 2', exact: true }).click()

    await expect(page.locator('[data-reparent-picker]')).toBeVisible()
    await page.getByTestId('reparent-tab-recurring-virtual').click()
    await expect(page.getByRole('button', { name: /もっと見る/ }).first()).toBeVisible({
      timeout: 15_000,
    })

    const scrollArea = page.locator('.reparent-picker__scroll')
    const scrollHeightBeforeSelect = await scrollArea.evaluate((el) => el.clientHeight)

    await selectRuleMonth(page, 'AMEX', seedMeta.targetRuleMonth)

    const tmpTop = path.join(artifactsDir, '_tmp-real-top.png')
    mkdirSync(artifactsDir, { recursive: true })
    await page.screenshot({ path: tmpTop, fullPage: false })
    saveShot('real-01-picker-virtual-selected-top.png', tmpTop)

    await scrollArea.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await expect(page.getByTestId('reparent-selection-summary')).toBeVisible()
    await expect(page.getByTestId('reparent-confirm-move')).toBeEnabled()

    const tmpScrolled = path.join(artifactsDir, '_tmp-real-scrolled.png')
    await page.screenshot({ path: tmpScrolled, fullPage: false })
    saveShot('real-02-picker-scrolled-footer-visible.png', tmpScrolled)
    await assertFooterSticky(page)

    await selectRuleMonth(page, '家賃', seedMeta.targetRuleMonth)
    await expect(page.getByTestId('reparent-selection-summary')).toContainText('家賃')

    const confirmMove = page.getByTestId('reparent-confirm-move').click()
    const toastAppeared = expect(page.getByText('繰越分を定期へ移動しました')).toBeVisible({
      timeout: 12_000,
    })
    await Promise.all([confirmMove, toastAppeared])
    await expect(page.getByRole('button', { name: '元に戻す' })).toHaveCount(0)
    const tmpToast = path.join(artifactsDir, '_tmp-real-toast.png')
    await page.screenshot({ path: tmpToast, fullPage: false })
    saveShot('real-03-post-move-toast.png', tmpToast)
    await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible({ timeout: 30_000 })

    const rentWithAddon = page.getByRole('button', { name: /家賃.*上乗せ 1件/ }).first()
    await rentWithAddon.scrollIntoViewIfNeeded()
    await rentWithAddon.click({ timeout: 20_000 })
    await page.getByTestId('addon-line-open').click()
    await expect(page.getByTestId('addon-line-detail')).toBeVisible()
    const tmpAddon = path.join(artifactsDir, '_tmp-real-addon.png')
    await page.screenshot({ path: tmpAddon, fullPage: false })
    saveShot('real-04-addon-sheet.png', tmpAddon)

    await page.getByRole('button', { name: '元の取引に戻す' }).click()
    await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /E2E移動元.*-¥54,000/ })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByText(/E2E移動元/).click()
    const editDialog = page.getByRole('dialog')
    await expect(editDialog.getByText('繰越分')).toBeVisible()
    await expect(editDialog.getByText('本体')).toBeVisible()
    const tmpUndo = path.join(artifactsDir, '_tmp-real-undo.png')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible()
    await page.screenshot({ path: tmpUndo, fullPage: false })
    saveShot('real-05-after-undo-forecast.png', tmpUndo)

    await page.getByText(/E2E移動元/).click()
    await page.getByRole('button', { name: '別の取引へ移動 2', exact: true }).click()
    await page.getByTestId('reparent-tab-recurring-virtual').click()
    await selectRuleMonth(page, '家賃', seedMeta.targetRuleMonth)
    await page.getByTestId('reparent-confirm-move').click()
    await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: /家賃.*上乗せ 1件/ }).first().click()
    await page.getByTestId('addon-line-open').click()
    await page.getByRole('button', { name: '別の場所へ移動' }).click()
    await page.getByTestId('reparent-tab-recurring-virtual').click()
    await selectRuleMonth(page, '家賃', seedMeta.moveTargetRuleMonth)
    await page.getByTestId('reparent-confirm-move').click()
    await expect(page.getByRole('heading', { name: '残高予測' })).toBeVisible({ timeout: 30_000 })

    await expect(page.getByRole('button', { name: /家賃.*上乗せ 1件/ }).first()).toBeVisible({
      timeout: 20_000,
    })
    const tmpMoved = path.join(artifactsDir, '_tmp-real-moved-month.png')
    await page.screenshot({ path: tmpMoved, fullPage: false })
    saveShot('real-06-after-addon-moved-month.png', tmpMoved)

    const metrics = {
      mainBranchCandidateScrollMaxPx: MAIN_BRANCH_CANDIDATE_SCROLL_MAX_PX,
      prStickyPickerScrollClientHeightPx: scrollHeightBeforeSelect,
      deltaPx: scrollHeightBeforeSelect - MAIN_BRANCH_CANDIDATE_SCROLL_MAX_PX,
      viewport: { width: 375, height: 812 },
    }
    writeFileSync(path.join(storeDir, 'scroll-metrics.json'), JSON.stringify(metrics, null, 2) + '\n')
    writeFileSync(path.join(artifactsDir, 'scroll-metrics.json'), JSON.stringify(metrics, null, 2) + '\n')
    console.log('scroll-metrics', metrics)
  })
})