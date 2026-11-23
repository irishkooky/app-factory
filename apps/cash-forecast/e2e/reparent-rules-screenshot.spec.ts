import { expect, test } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const storeDir = '/cursor/stores/self/media/reparent-rules'
const artifactsDir = path.join(root, 'artifacts-reparent-rules')
const harnessBase = 'http://localhost:5199'

const shots: { view: string; file: string; note: string }[] = [
  { view: 'picker-pro', file: '01-picker-pro-three-sections.png', note: 'Pro: 3 sections' },
  { view: 'picker-free', file: '02-picker-free-oneoff-only.png', note: 'Free: one-off only' },
  { view: 'before-move', file: '03-before-move-to-rule-month.png', note: 'Before move' },
  { view: 'after-move', file: '04-after-move-addon-on-virtual-month.png', note: 'After move' },
  { view: 'date-warning', file: '05-date-difference-warning.png', note: 'Date warning' },
  { view: 'undo-toast', file: '06-undo-toast.png', note: 'Undo toast' },
]

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

      if (shot.view === 'date-warning') {
        await expect(page.getByText(/ルール発生日と違う/)).toBeVisible({ timeout: 10_000 })
      }
      if (shot.view === 'undo-toast') {
        await expect(page.getByText('繰越分を定期へ移動しました')).toBeVisible({ timeout: 10_000 })
        await expect(page.getByRole('button', { name: '元に戻す' })).toBeVisible()
      }
      if (shot.view === 'picker-free') {
        await expect(page.getByText('定期（未確定の月）')).toHaveCount(0)
        await expect(page.getByText('単発の取引')).toBeVisible()
      }
      if (shot.view === 'picker-pro') {
        await expect(page.getByText('単発の取引')).toBeVisible()
        await expect(page.getByText('定期（未確定の月）')).toBeVisible()
        await expect(page.getByText('定期（確定済み）')).toBeVisible()
        await expect(page.getByTestId('harness-meta')).toContainText('基準日 2026-03-15')
      }

      if (shot.view === 'after-move') {
        await expect(page.getByTestId('source-header')).toContainText('¥54,000')
        await expect(page.getByTestId('source-header')).toContainText('¥50,000')
        await expect(page.getByTestId('target-header')).toContainText('¥130,000')
        await expect(page.getByTestId('target-header')).toContainText('¥134,000')
        await expect(page.getByTestId('addon-line')).toContainText('繰越分')
        await expect(page.getByTestId('rule-month-after')).toContainText('-¥134,000')
      }

      const tmp = path.join(artifactsDir, `_tmp-${shot.file}`)
      mkdirSync(artifactsDir, { recursive: true })
      await page.screenshot({ path: tmp, fullPage: true })
      const { local, store } = save(tmp, shot.file)
      console.log(`screenshot: ${local}`)
      console.log(`screenshot: ${store}`)
    })
  }
})