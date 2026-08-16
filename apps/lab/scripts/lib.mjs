// apps/lab の運用スクリプト（sync.mjs / shots.mjs）が共有する処理。
// このファイル自体はどちらのスクリプトの挙動も変えない、純粋な切り出しである。

import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

/** apps/lab のディレクトリ（process.cwd() に依存せず、このファイルの場所から解決する） */
export const APP_DIR = path.resolve(SCRIPT_DIR, '..')
/** apps/ ディレクトリ */
export const APPS_DIR = path.resolve(APP_DIR, '..')

/**
 * slug から Service Binding 名を決定する。sync.mjs（wrangler.jsonc の services）と
 * registry.gen.ts（RegistryEntry.binding）で必ず同じ規則を使うこと。
 */
export function bindingNameFor(slug) {
  return 'APP_' + slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')
}

/**
 * 文字列の比較。localeCompare はICU/ロケール依存で環境により結果が揺れるため、
 * コードポイント比較にする。
 */
export function compareStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * JSONC のコメント（`//` 行コメント / `/* ... *\/` ブロックコメント）を取り除く。
 * 文字列リテラル内の `//` を誤って消さないよう、1文字ずつ状態（文字列内/コメント内）を
 * 追跡する小さな状態機械として実装する。素朴な正規表現置換は使わない。
 */
export function stripJsonComments(input) {
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
export async function readWorkerName(appDir, slug) {
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
export async function listAppSlugs() {
  const entries = await readdir(APPS_DIR, { withFileTypes: true })
  const slugs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const wranglerPath = path.join(APPS_DIR, entry.name, 'wrangler.jsonc')
    if (existsSync(wranglerPath)) {
      slugs.push(entry.name)
    }
  }
  slugs.sort(compareStr)
  return slugs
}

/** Cloudflare API を叩いて JSON を返す。HTTPエラーは例外にする */
export async function fetchCloudflareJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Cloudflare から subdomain と デプロイ済み Worker（scripts）一覧を取得する。
 * `success !== true` や想定外の形（欠落・型不一致）のレスポンスは例外にする
 * （黙って空値のまま呼び出し元を壊さないため）。
 */
export async function fetchCloudflareState(accountId, token) {
  const subdomainBody = await fetchCloudflareJson(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
    token,
  )
  const subdomain = subdomainBody?.result?.subdomain
  if (subdomainBody?.success !== true || typeof subdomain !== 'string' || subdomain.length === 0) {
    throw new Error('workers/subdomain のレスポンスが想定外の形式です（success !== true または subdomain が文字列でない）')
  }

  const scriptsBody = await fetchCloudflareJson(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`,
    token,
  )
  if (scriptsBody?.success !== true || !Array.isArray(scriptsBody?.result)) {
    throw new Error('workers/scripts のレスポンスが想定外の形式です（success !== true または result が配列でない）')
  }

  return { subdomain, scripts: scriptsBody.result }
}

/** workers/scripts の一覧を id（= workerName）をキーにした Map にする */
export function scriptsById(scripts) {
  const map = new Map()
  for (const script of scripts) {
    if (script && typeof script === 'object' && typeof script.id === 'string') {
      map.set(script.id, script)
    }
  }
  return map
}
