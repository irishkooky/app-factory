#!/usr/bin/env node
// apps/ を走査し、Cloudflare Workers API からデプロイ状況を取得して
// src/data/registry.gen.ts を再生成する。
//
// 使い方: node scripts/sync.mjs
// 必要な環境変数: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SCRIPT_DIR, '..') // apps/lab
const APPS_DIR = path.resolve(APP_DIR, '..') // apps/
const SHOTS_DIR = path.join(APP_DIR, 'public', 'shots')
const REGISTRY_OUTPUT_PATH = path.join(APP_DIR, 'src', 'data', 'registry.gen.ts')
const WRANGLER_OUTPUT_PATH = path.join(APP_DIR, 'wrangler.jsonc')
const SELF_SLUG = 'lab'

function fail(message) {
  console.error(`sync.mjs: ${message}`)
  process.exitCode = 1
}

/**
 * slug から Service Binding 名を決定する。sync.mjs（wrangler.jsonc の services）と
 * registry.gen.ts（RegistryEntry.binding）で必ず同じ規則を使うこと。
 */
function bindingNameFor(slug) {
  return 'APP_' + slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')
}

// バインディング名は `env.<NAME>` として参照する識別子である必要がある。
// 現在の formula は先頭に必ず 'APP_' を付けるため実質的には発生しないが、
// 将来 formula が変わっても壊れた wrangler.jsonc を書き出さないよう防御的に検証する。
const VALID_BINDING_NAME = /^[A-Z_][A-Z0-9_]*$/

/**
 * JSONC のコメント（`//` 行コメント / `/* ... *\/` ブロックコメント）を取り除く。
 * 文字列リテラル内の `//` を誤って消さないよう、1文字ずつ状態（文字列内/コメント内）を
 * 追跡する小さな状態機械として実装する。素朴な正規表現置換は使わない。
 */
function stripJsonComments(input) {
  let out = ''
  let i = 0
  const len = input.length
  let inString = false
  let stringQuote = ''
  let inLineComment = false
  let inBlockComment = false

  while (i < len) {
    const ch = input[i]
    const next = i + 1 < len ? input[i + 1] : ''

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        out += ch
      }
      i++
      continue
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i += 2
        continue
      }
      i++
      continue
    }

    if (inString) {
      out += ch
      if (ch === '\\' && i + 1 < len) {
        // エスケープシーケンスの次の1文字はそのまま出力し、引用符終端の誤判定を避ける
        out += next
        i += 2
        continue
      }
      if (ch === stringQuote) {
        inString = false
      }
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      inString = true
      stringQuote = ch
      out += ch
      i++
      continue
    }

    if (ch === '/' && next === '/') {
      inLineComment = true
      i += 2
      continue
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true
      i += 2
      continue
    }

    out += ch
    i++
  }

  return out
}

/** wrangler.jsonc から name を読む。読めない・パースできない場合は slug をそのまま使い、警告を出す */
async function readWorkerName(appDir, slug) {
  const wranglerPath = path.join(appDir, 'wrangler.jsonc')
  try {
    const raw = await readFile(wranglerPath, 'utf8')
    const stripped = stripJsonComments(raw)
    const parsed = JSON.parse(stripped)
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && parsed.name.length > 0) {
      return parsed.name
    }
    console.warn(`${slug}: wrangler.jsonc の解析に失敗したため name に slug を使用`)
  } catch {
    console.warn(`${slug}: wrangler.jsonc の解析に失敗したため name に slug を使用`)
  }
  return slug
}

/** apps/<slug>/wrangler.jsonc を持つディレクトリ名（slug）一覧を辞書順で返す */
async function listAppSlugs() {
  const entries = await readdir(APPS_DIR, { withFileTypes: true })
  const slugs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const wranglerPath = path.join(APPS_DIR, entry.name, 'wrangler.jsonc')
    if (existsSync(wranglerPath)) {
      slugs.push(entry.name)
    }
  }
  // localeCompare はICU/ロケール依存で環境により結果が揺れるため、コードポイント比較にする
  slugs.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return slugs
}

async function hasShot(slug) {
  try {
    const st = await stat(path.join(SHOTS_DIR, `${slug}.jpg`))
    return st.isFile()
  } catch {
    return false
  }
}

async function fetchCloudflareJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`)
  }
  return res.json()
}

function formatRegistryFile(subdomain, entries) {
  const lines = []
  lines.push('// このファイルは scripts/sync.mjs が生成します。手で編集しないでください。')
  lines.push('')
  lines.push('export type RegistryEntry = {')
  lines.push('  /** apps/ 配下のディレクトリ名 */')
  lines.push('  slug: string')
  lines.push('  /** wrangler.jsonc の name（= workers.dev のサブドメイン） */')
  lines.push('  workerName: string')
  lines.push('  /** 公開URL */')
  lines.push('  url: string')
  lines.push('  /** Cloudflare 上に Worker が存在するか */')
  lines.push('  deployed: boolean')
  lines.push('  /** Worker の作成日時 ISO8601。未デプロイなら null */')
  lines.push('  createdAt: string | null')
  lines.push('  /** Worker の最終更新日時 ISO8601。未デプロイなら null */')
  lines.push('  modifiedAt: string | null')
  lines.push('  /** public/shots/<slug>.jpg が存在するか */')
  lines.push('  hasShot: boolean')
  lines.push('  /** wrangler.jsonc の services に登録した Service Binding 名。deployed かつ lab 自身以外のときだけ入る */')
  lines.push('  binding: string | null')
  lines.push('}')
  lines.push('')
  lines.push(`export const SUBDOMAIN = ${JSON.stringify(subdomain)}`)
  lines.push(`export const GENERATED_AT = ${JSON.stringify(new Date().toISOString())}`)
  lines.push('')
  lines.push('export const REGISTRY: RegistryEntry[] = [')
  for (const entry of entries) {
    lines.push('  {')
    lines.push(`    slug: ${JSON.stringify(entry.slug)},`)
    lines.push(`    workerName: ${JSON.stringify(entry.workerName)},`)
    lines.push(`    url: ${JSON.stringify(entry.url)},`)
    lines.push(`    deployed: ${entry.deployed ? 'true' : 'false'},`)
    lines.push(`    createdAt: ${entry.createdAt === null ? 'null' : JSON.stringify(entry.createdAt)},`)
    lines.push(`    modifiedAt: ${entry.modifiedAt === null ? 'null' : JSON.stringify(entry.modifiedAt)},`)
    lines.push(`    hasShot: ${entry.hasShot ? 'true' : 'false'},`)
    lines.push(`    binding: ${entry.binding === null ? 'null' : JSON.stringify(entry.binding)},`)
    lines.push('  },')
  }
  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

/** wrangler.jsonc を丸ごと生成する。services は deployed かつ lab 以外の Worker だけを含む */
function formatWranglerJsonc(services) {
  const config = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: SELF_SLUG,
    compatibility_date: '2026-07-01',
    compatibility_flags: ['nodejs_compat'],
    main: '@tanstack/react-start/server-entry',
  }
  if (services.length > 0) {
    config.services = services
  }
  const header = '// このファイルは scripts/sync.mjs が生成します。手で編集しないでください。\n'
  return header + JSON.stringify(config, null, 2) + '\n'
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

  if (!token || !accountId) {
    fail(
      'CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID が設定されていません。既存の registry.gen.ts は変更せず終了します。',
    )
    return
  }

  let subdomain
  let scripts

  try {
    const subdomainBody = await fetchCloudflareJson(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
      token,
    )
    const fetchedSubdomain = subdomainBody?.result?.subdomain
    // success !== true や result.subdomain が文字列でない場合は「200だが想定外のボディ」として
    // 異常系扱いにする（黙って空値のまま registry を壊さないため）
    if (subdomainBody?.success !== true || typeof fetchedSubdomain !== 'string' || fetchedSubdomain.length === 0) {
      throw new Error('workers/subdomain のレスポンスが想定外の形式です（success !== true または subdomain が文字列でない）')
    }
    subdomain = fetchedSubdomain

    const scriptsBody = await fetchCloudflareJson(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`,
      token,
    )
    // success !== true や result が配列でない場合も同様に異常系扱いにする
    if (scriptsBody?.success !== true || !Array.isArray(scriptsBody?.result)) {
      throw new Error('workers/scripts のレスポンスが想定外の形式です（success !== true または result が配列でない）')
    }
    scripts = scriptsBody.result
  } catch (err) {
    fail(
      `Cloudflare API の取得に失敗しました（${err instanceof Error ? err.message : String(err)}）。既存の registry.gen.ts は変更せず終了します。`,
    )
    return
  }

  const scriptsByName = new Map()
  for (const script of scripts) {
    if (script && typeof script === 'object' && typeof script.id === 'string') {
      scriptsByName.set(script.id, script)
    }
  }

  const slugs = await listAppSlugs()

  const entries = []
  for (const slug of slugs) {
    const appDir = path.join(APPS_DIR, slug)
    const workerName = await readWorkerName(appDir, slug)
    const script = scriptsByName.get(workerName)
    const deployed = Boolean(script)
    const createdAt = typeof script?.created_on === 'string' ? script.created_on : null
    const modifiedAt = typeof script?.modified_on === 'string' ? script.modified_on : null
    const shot = await hasShot(slug)
    // Service Binding は「実在する（deployed）」かつ「自分自身ではない」ときだけ割り当てる。
    // 未デプロイの Worker を services に書くと wrangler deploy が失敗するため
    const binding = deployed && slug !== SELF_SLUG ? bindingNameFor(slug) : null

    entries.push({
      slug,
      workerName,
      url: `https://${workerName}.${subdomain}.workers.dev`,
      deployed,
      createdAt,
      modifiedAt,
      hasShot: shot,
      binding,
    })
  }

  // wrangler.jsonc / registry.gen.ts のどちらも書き出す前に、バインディング名の
  // 妥当性・重複を検証する（片方だけ書き換わる中途半端な状態を作らないため）
  const bindingOwners = new Map()
  for (const entry of entries) {
    if (entry.binding === null) continue
    if (!VALID_BINDING_NAME.test(entry.binding)) {
      fail(
        `${entry.slug}: バインディング名 "${entry.binding}" が識別子として不正です。wrangler.jsonc / registry.gen.ts は変更せず終了します。`,
      )
      return
    }
    const owners = bindingOwners.get(entry.binding) ?? []
    owners.push(entry.slug)
    bindingOwners.set(entry.binding, owners)
  }
  for (const [bindingName, owners] of bindingOwners) {
    if (owners.length > 1) {
      fail(
        `バインディング名 "${bindingName}" が重複しています（${owners.join(', ')}）。wrangler.jsonc / registry.gen.ts は変更せず終了します。`,
      )
      return
    }
  }

  // 両方の出力内容を先に組み立ててから、まとめて書き出す
  const registryOutput = formatRegistryFile(subdomain, entries)
  const services = entries
    .filter((e) => e.binding !== null)
    .map((e) => ({ binding: e.binding, service: e.workerName }))
  const wranglerOutput = formatWranglerJsonc(services)

  await writeFile(REGISTRY_OUTPUT_PATH, registryOutput, 'utf8')
  await writeFile(WRANGLER_OUTPUT_PATH, wranglerOutput, 'utf8')

  const deployedCount = entries.filter((e) => e.deployed).length
  const shotCount = entries.filter((e) => e.hasShot).length
  console.log(`${entries.length}件（デプロイ済み ${deployedCount}件 / スクショ ${shotCount}件）を書き出しました`)
  console.log(`バインディング ${services.length}件を wrangler.jsonc に書き出しました`)
}

await main()
