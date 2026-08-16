#!/usr/bin/env node
// apps/ 配下のデプロイ済みアプリのスクリーンショットを撮って
// public/shots/<slug>.jpg に保存する。
//
// 使い方:
//   node scripts/shots.mjs              # スクショが無いアプリだけ撮る（既定）
//   node scripts/shots.mjs --all        # 全アプリを撮り直す
//   node scripts/shots.mjs --only <slug> [--only <slug> ...]  # 指定したアプリだけ撮る
//
// 必要な環境変数: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
// 本番URLはこのサンドボックスからヘッドレスChromiumで直接開けない（外部TLSが遮断される）ため、
// page.route('**/*') で全リクエストを Node の fetch にリレーしている。
//
// package.json からは `vp run shots`（内部で NODE_USE_ENV_PROXY=1 node scripts/shots.mjs）
// として呼ぶ想定。

import { writeFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  APP_DIR,
  APPS_DIR,
  fetchCloudflareState,
  listAppSlugs,
  readWorkerName,
  scriptsById,
} from './lib.mjs'

const SHOTS_DIR = path.join(APP_DIR, 'public', 'shots')

// ポータル上で hidden 扱い（一覧に出ない）のため、画像が使われないアプリ。
// --only で明示的に指定された場合はここではスキップしない。
const SKIP_SLUGS = new Set(['lab', 'hello'])

const VIEWPORT = { width: 1200, height: 750 }
const NAV_TIMEOUT_MS = 40000
const SETTLE_DELAY_MS = 1200
const JPEG_QUALITY = 82

function parseArgs(argv) {
  let all = false
  const only = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    // `vp run shots -- --only x` のように区切りの `--` が素通りしてくることがあるので無視する
    if (arg === '--') {
      continue
    }
    if (arg === '--all') {
      all = true
      continue
    }
    if (arg === '--only') {
      const value = argv[i + 1]
      if (!value) {
        throw new Error('--only にはアプリの slug を指定してください')
      }
      only.push(value)
      i++
      continue
    }
    throw new Error(`不明な引数です: ${arg}`)
  }
  return { all, only }
}

async function hasShot(slug) {
  try {
    const st = await stat(path.join(SHOTS_DIR, `${slug}.jpg`))
    return st.isFile()
  } catch {
    return false
  }
}

/** playwright を解決する。リポジトリの依存ではなくサンドボックスにグローバル導入されている前提 */
async function loadPlaywright() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']
  for (const specifier of candidates) {
    try {
      return await import(specifier)
    } catch {
      // 次の候補を試す
    }
  }
  console.error('shots.mjs: Playwright が見つかりません。npm i -g playwright で導入してください。')
  process.exit(1)
}

/**
 * 全リクエストを Node の fetch にリレーする。ヘッドレスChromiumの外部TLSが
 * このサンドボックスでは遮断されているための回避策。Chromium 自体にはプロキシを
 * 設定しないこと（localhost への読み込みまでプロキシに送られてしまう）。
 */
async function installFetchRelay(page) {
  await page.route('**/*', async (route) => {
    const req = route.request()
    try {
      const res = await fetch(req.url(), {
        method: req.method(),
        headers: req.headers(),
        body: req.postDataBuffer() ?? undefined,
        redirect: 'follow',
      })
      const body = Buffer.from(await res.arrayBuffer())
      const headers = {}
      res.headers.forEach((v, k) => {
        if (!/^(content-encoding|content-length|transfer-encoding|connection)$/i.test(k)) headers[k] = v
      })
      // res.status はプロパティ（メソッドではない）
      await route.fulfill({ status: res.status, headers, body })
    } catch {
      await route.abort()
    }
  })
}

/** 1アプリ分のスクリーンショットを撮り、JPEGのBufferを返す */
async function captureShot(browser, app) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  })
  try {
    const page = await context.newPage()
    await installFetchRelay(page)
    await page.goto(app.url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS })
    await page.waitForTimeout(SETTLE_DELAY_MS)
    return await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY })
  } finally {
    await context.close()
  }
}

/** 一時ファイルに書いてから rename する。失敗時に既存の <slug>.jpg を壊さないため */
async function writeShotAtomic(slug, buffer) {
  const destPath = path.join(SHOTS_DIR, `${slug}.jpg`)
  const tmpPath = `${destPath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmpPath, buffer)
  await rename(tmpPath, destPath)
}

/** apps/ を走査し、Cloudflare 上のデプロイ状況と突き合わせたアプリ一覧を返す */
async function resolveApps(accountId, token) {
  const { subdomain, scripts } = await fetchCloudflareState(accountId, token)
  const scriptsByName = scriptsById(scripts)

  const slugs = await listAppSlugs()
  const apps = []
  for (const slug of slugs) {
    const appDir = path.join(APPS_DIR, slug)
    const workerName = await readWorkerName(appDir, slug)
    const deployed = scriptsByName.has(workerName)
    apps.push({
      slug,
      workerName,
      deployed,
      url: `https://${workerName}.${subdomain}.workers.dev`,
    })
  }
  return apps
}

/** --all / --only の指定に従って撮影対象を決める */
async function resolveTargets(apps, { all, only }) {
  const appsBySlug = new Map(apps.map((a) => [a.slug, a]))
  const targets = []
  let skipCount = 0

  if (only.length > 0) {
    for (const slug of only) {
      const app = appsBySlug.get(slug)
      if (!app) {
        console.warn(`shots.mjs: ${slug} は apps/ に見つからないためスキップします`)
        skipCount++
        continue
      }
      if (!app.deployed) {
        console.warn(`shots.mjs: ${slug} は未デプロイのためスキップします`)
        skipCount++
        continue
      }
      // --only は明示指定なので SKIP_SLUGS・既存スクショの有無に関わらず必ず撮る
      targets.push(app)
    }
    return { targets, skipCount }
  }

  for (const app of apps) {
    if (SKIP_SLUGS.has(app.slug)) {
      skipCount++
      continue
    }
    if (!app.deployed) {
      console.warn(`shots.mjs: ${app.slug} は未デプロイのためスキップします`)
      skipCount++
      continue
    }
    if (!all && (await hasShot(app.slug))) {
      skipCount++
      continue
    }
    targets.push(app)
  }
  return { targets, skipCount }
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(`shots.mjs: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !accountId) {
    console.error('shots.mjs: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID が設定されていません。')
    process.exit(1)
  }

  let apps
  try {
    apps = await resolveApps(accountId, token)
  } catch (err) {
    console.error(`shots.mjs: Cloudflare API の取得に失敗しました（${err instanceof Error ? err.message : String(err)}）`)
    process.exit(1)
  }

  const { targets, skipCount } = await resolveTargets(apps, args)

  if (targets.length === 0) {
    console.log(`撮影 0件 / スキップ ${skipCount}件 / 失敗 0件`)
    process.exit(0)
  }

  const { chromium } = await loadPlaywright()

  let shotCount = 0
  let failCount = 0
  let browser
  try {
    browser = await chromium.launch()
    for (const app of targets) {
      try {
        const buffer = await captureShot(browser, app)
        await writeShotAtomic(app.slug, buffer)
        shotCount++
        console.log(`shots.mjs: ${app.slug} を撮影しました（${buffer.length}バイト）`)
      } catch (err) {
        failCount++
        console.error(`shots.mjs: ${app.slug} の撮影に失敗しました（${err instanceof Error ? err.message : String(err)}）`)
      }
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }

  console.log(`撮影 ${shotCount}件 / スキップ ${skipCount}件 / 失敗 ${failCount}件`)
  process.exit(failCount > 0 ? 1 : 0)
}

await main()
