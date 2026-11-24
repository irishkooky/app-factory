import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const storeDir = '/cursor/stores/self/media/reparent-rules'
const artifactsDir = path.join(root, 'artifacts-reparent-rules')
const harnessBase = 'http://localhost:5199'

const shots: { view: string; file: string; note: string; extra?: (page: import('@playwright/test').Page) => Promise<void> }[] = [
  { view: 'picker-tab-oneoff', file: '01-picker-tab-oneoff.png', note: 'Pro tab oneoff' },
  {
    view: 'picker-tab-oneoff-selected',
    file: '01-picker-tab-oneoff-selected.png',
    note: 'Pro oneoff selected',
    extra: async (page) => {
      await expect(page.locator('.reparent-candidate-card--selected')).toHaveCount(1)
      const accentBorder = await page.locator('.reparent-candidate-card--selected').evaluate((el) => {
        const s = getComputedStyle(el)
        return { borderWidth: parseFloat(s.borderTopWidth), bg: s.backgroundColor }
      })
      expect(accentBorder.borderWidth).toBeGreaterThanOrEqual(2)
      expect(accentBorder.bg).not.toBe('rgba(0, 0, 0, 0)')
    },
  },
  { view: 'picker-tab-virtual-collapsed', file: '02-picker-tab-virtual-collapsed.png', note: 'Pro virtual collapsed' },
  { view: 'picker-tab-virtual-expanded', file: '03-picker-tab-virtual-expanded.png', note: 'Pro virtual expanded' },
  { view: 'picker-tab-confirmed', file: '04-picker-tab-confirmed.png', note: 'Pro confirmed' },
  { view: 'picker-free', file: '05-picker-free.png', note: 'Free oneoff only' },
  { view: 'picker-search', file: '06-picker-search.png', note: 'Search in progress' },
  { view: 'before-move', file: '07-before-move.png', note: 'Before move' },
  { view: 'after-move', file: '04-after-move.png', note: 'After move (fixed)' },
  {
    view: 'date-warning',
    file: '09-date-warning.png',
    note: 'Date warning',
    extra: async (page) => {
      await page.getByTestId('reparent-tab-recurring-virtual').click()
      await page
        .locator('[data-rule-group]', { hasText: '家賃' })
        .locator('button[data-candidate-key]', { hasText: '4/25' })
        .first()
        .click()
      await expect(page.getByTestId('reparent-picker-footer').getByText(/ルール発生日と違う/)).toBeVisible({
        timeout: 10_000,
      })
    },
  },
  {
    view: 'post-move-toast',
    file: '10-post-move-toast.png',
    note: 'Post-move toast (no undo)',
    extra: async (page) => {
      await expect(page.getByText('繰越分を定期へ移動しました')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('button', { name: '元に戻す' })).toHaveCount(0)
    },
  },
  {
    view: 'addon-line-detail',
    file: '11-addon-line-detail.png',
    note: 'Addon line detail',
    extra: async (page) => {
      await expect(page.getByTestId('addon-line-detail')).toBeVisible()
      await expect(page.getByRole('button', { name: '元の取引に戻す' })).toBeVisible()
      await expect(page.getByRole('button', { name: '別の場所へ移動' })).toBeVisible()
    },
  },
  {
    view: 'after-undo',
    file: '12-after-undo-amounts.png',
    note: 'Amounts after undo',
    extra: async (page) => {
      await expect(page.getByTestId('after-undo-amounts')).toContainText('¥54,000')
    },
  },
]

const PICKER_GRID_VIEWS = new Set([
  'picker-tab-oneoff',
  'picker-tab-oneoff-selected',
  'picker-tab-virtual-collapsed',
  'picker-tab-virtual-expanded',
  'picker-tab-confirmed',
  'picker-free',
  'picker-search',
])

async function expectPickerGridLayout(page: import('@playwright/test').Page) {
  const grid = page.locator('[data-reparent-picker] [data-testid="reparent-candidate-grid"]').first()
  await expect(grid).toBeVisible()
  const metrics = await grid.evaluate((el) => {
    const gridStyle = getComputedStyle(el)
    const card = el.querySelector<HTMLElement>('.reparent-candidate-card')
    if (!card) return null
    const cardStyle = getComputedStyle(card)
    return {
      gridTemplateColumns: gridStyle.gridTemplateColumns,
      cardPaddingTop: parseFloat(cardStyle.paddingTop),
      cardBorderWidth: parseFloat(cardStyle.borderTopWidth),
      cardWidth: card.offsetWidth,
      gridWidth: el.clientWidth,
    }
  })
  expect(metrics).not.toBeNull()
  const columns = metrics!.gridTemplateColumns.trim()
  const colParts = columns.split(/\s+/).filter((p) => p.length > 0)
  expect(colParts.length).toBeGreaterThanOrEqual(2)
  expect(metrics!.cardPaddingTop).toBeGreaterThanOrEqual(11)
  expect(metrics!.cardBorderWidth).toBeGreaterThanOrEqual(1)
  expect(metrics!.cardWidth).toBeGreaterThan(metrics!.gridWidth * 0.38)
}

function save(pagePath: string, fileName: string) {
  mkdirSync(artifactsDir, { recursive: true })
  mkdirSync(storeDir, { recursive: true })
  const local = path.join(artifactsDir, fileName)
  const store = path.join(storeDir, fileName)
  copyFileSync(pagePath, local)
  copyFileSync(pagePath, store)
  return { local, store }
}

test.describe('reparent rules UI harness (#123/#124)', () => {
  for (const shot of shots) {
    test(shot.note, async ({ page }) => {
      await page.goto(`${harnessBase}/?view=${shot.view}`)
      await page.waitForLoadState('networkidle')
      await expect(page.locator(`[data-view="${shot.view}"]`)).toBeVisible({ timeout: 15_000 })
      if (shot.view === 'picker-tab-virtual-expanded') {
        await page.waitForTimeout(400)
      }

      if (shot.view.startsWith('picker-')) {
        await expect(page.locator('[data-reparent-picker]')).toBeVisible()
        await expect(page.getByTestId('harness-meta')).toContainText('基準日 2026-03-15')
      }

      if (PICKER_GRID_VIEWS.has(shot.view)) {
        if (shot.view === 'picker-tab-oneoff-selected') await page.waitForTimeout(200)
        await expectPickerGridLayout(page)
      }

      if (shot.view === 'picker-tab-oneoff' || shot.view === 'picker-search') {
        await expect(page.locator('[data-reparent-picker]').getByText('4月の支出')).toHaveCount(0)
      }

      if (shot.view === 'picker-free') {
        await expect(page.getByText('定期・未確定')).toHaveCount(0)
      }

      if (shot.view === 'picker-search') {
        await expect(page.getByRole('textbox', { name: '移動先を検索' })).toHaveValue('食料')
      }

      if (shot.view === 'picker-tab-virtual-collapsed') {
        await expect(page.locator('[data-reparent-picker]').getByRole('button', { name: /もっと見る/ }).first()).toBeVisible()
        expect(await page.locator('[data-reparent-picker]').getByRole('button', { name: /もっと見る/ }).count()).toBeGreaterThanOrEqual(1)
        const group = page.locator('[data-rule-group]').first()
        await expect(group.locator('button[data-candidate-key]').first()).toContainText('2026年')
        await expect(group.locator('button[data-candidate-key]').first()).not.toContainText('（2026年')
      }

      if (shot.view === 'picker-tab-virtual-expanded') {
        await expect(page.getByText(/もっと見る/)).toHaveCount(0, { timeout: 10_000 })
      }

      if (shot.view === 'after-move') {
        await expect(page.getByTestId('source-header')).toContainText('¥54,000')
        await expect(page.getByTestId('source-header')).toContainText('¥50,000')
        await expect(page.getByTestId('target-header')).toContainText('¥130,000')
        await expect(page.getByTestId('target-header')).toContainText('¥134,000')
        await expect(page.getByTestId('addon-line')).toContainText('繰越分')
        const addonLine = page.getByTestId('addon-line')
        await expect(addonLine).toContainText('-¥4,000')
        await expect(page.getByTestId('rule-month-after')).toContainText('-¥134,000')
      }

      if (shot.extra) await shot.extra(page)

      const tmp = path.join(artifactsDir, `_tmp-${shot.file}`)
      mkdirSync(artifactsDir, { recursive: true })
      await page.screenshot({ path: tmp, fullPage: true })
      const { local, store } = save(tmp, shot.file)
      console.log(`screenshot: ${local}`)
      console.log(`screenshot: ${store}`)
    })
  }
})