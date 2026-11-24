import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const storeDir = '/cursor/stores/bc-c803f8f1-bb61-46e3-8c93-8305f25c800c/media/reparent-ux'
const artifactsDir = path.join(root, 'artifacts-reparent-ux')
const harnessBase = 'http://localhost:5199'

function save(pagePath: string, fileName: string) {
  mkdirSync(artifactsDir, { recursive: true })
  mkdirSync(storeDir, { recursive: true })
  const local = path.join(artifactsDir, fileName)
  const store = path.join(storeDir, fileName)
  copyFileSync(pagePath, local)
  copyFileSync(pagePath, store)
  return { local, store }
}

async function assertStickyFooterAtViewportBottom(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('[data-testid="reparent-picker-footer"]')
    const sheet = document.querySelector<HTMLElement>('[data-testid="harness-sheet"]')
    if (!footer || !sheet) return null
    const footerRect = footer.getBoundingClientRect()
    const sheetRect = sheet.getBoundingClientRect()
    const style = getComputedStyle(footer)
    return {
      footerBottom: footerRect.bottom,
      sheetBottom: sheetRect.bottom,
      viewportHeight: window.innerHeight,
      position: style.position,
    }
  })
  expect(metrics).not.toBeNull()
  expect(metrics!.position).toBe('sticky')
  expect(metrics!.sheetBottom).toBeGreaterThanOrEqual(metrics!.viewportHeight - 2)
  expect(metrics!.sheetBottom).toBeLessThanOrEqual(metrics!.viewportHeight + 1)
  expect(Math.abs(metrics!.footerBottom - metrics!.sheetBottom)).toBeLessThanOrEqual(20)
}

test.describe('reparent UX sticky footer (#PR1)', () => {
  test('unselected → 移動する disabled', async ({ page }) => {
    await page.goto(`${harnessBase}/?view=picker-tab-oneoff`)
    await expect(page.locator('[data-reparent-picker]')).toBeVisible({ timeout: 15_000 })
    const move = page.getByTestId('reparent-confirm-move')
    await expect(move).toBeVisible()
    await expect(move).toBeDisabled()
    await assertStickyFooterAtViewportBottom(page)

    const tmp = path.join(artifactsDir, '_tmp-unselected.png')
    mkdirSync(artifactsDir, { recursive: true })
    await page.screenshot({ path: tmp, fullPage: false })
    save(tmp, '01-picker-unselected-footer.png')
  })

  test('scrolled + selected → summary and 移動する visible', async ({ page }) => {
    await page.goto(`${harnessBase}/?view=picker-tab-oneoff-selected`)
    await expect(page.locator('[data-reparent-picker]')).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(250)

    const scroll = page.locator('.reparent-picker__scroll')
    await scroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await expect(page.getByTestId('reparent-selection-summary')).toBeVisible()
    await expect(page.getByTestId('reparent-confirm-move')).toBeEnabled()
    await assertStickyFooterAtViewportBottom(page)

    const tmp = path.join(artifactsDir, '_tmp-scrolled-selected.png')
    await page.screenshot({ path: tmp, fullPage: false })
    save(tmp, '02-picker-scrolled-selection-visible.png')
  })
})