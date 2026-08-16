#!/usr/bin/env node
// apps/ を走査し、Cloudflare Workers API からデプロイ状況を取得して
// src/data/registry.gen.ts を再生成する。
//
// 使い方: node scripts/sync.mjs
// 必要な環境変数: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

import { writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  APP_DIR,
  APPS_DIR,
  bindingNameFor,
  fetchCloudflareState,
  listAppSlugs,
  readWorkerName,
  scriptsById,
} from './lib.mjs'

const SHOTS_DIR = path.join(APP_DIR, 'public', 'shots')
const REGISTRY_OUTPUT_PATH = path.join(APP_DIR, 'src', 'data', 'registry.gen.ts')
const WRANGLER_OUTPUT_PATH = path.join(APP_DIR, 'wrangler.jsonc')
const SELF_SLUG = 'lab'

function fail(message) {
  console.error(`sync.mjs: ${message}`)
  process.exitCode = 1
}

// バインディング名は `env.<NAME>` として参照する識別子である必要がある。
// 現在の formula は先頭に必ず 'APP_' を付けるため実質的には発生しないが、
// 将来 formula が変わっても壊れた wrangler.jsonc を書き出さないよう防御的に検証する。
const VALID_BINDING_NAME = /^[A-Z_][A-Z0-9_]*$/

async function hasShot(slug) {
  try {
    const st = await stat(path.join(SHOTS_DIR, `${slug}.jpg`))
    return st.isFile()
  } catch {
    return false
  }
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
    const state = await fetchCloudflareState(accountId, token)
    subdomain = state.subdomain
    scripts = state.scripts
  } catch (err) {
    fail(
      `Cloudflare API の取得に失敗しました（${err instanceof Error ? err.message : String(err)}）。既存の registry.gen.ts は変更せず終了します。`,
    )
    return
  }

  const scriptsByName = scriptsById(scripts)

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
