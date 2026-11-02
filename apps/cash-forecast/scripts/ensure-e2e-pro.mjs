#!/usr/bin/env node
/**
 * Grant the Clerk E2E user Pro via a Stripe test-mode trial (Convex admin:ensureE2ePro).
 *
 * Durable path: Convex action uses STRIPE_SECRET_KEY / STRIPE_PRICE_ID on the deployment
 * (not Cloud Agent Secrets) to create a customer + trialing subscription, then upserts
 * the subscriptions table so getPlan / ProGate unlock.
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY (resolve user id)
 *   - apps/cash-forecast/.env.local with CONVEX_DEPLOY_KEY (npx convex run)
 *   - Stripe already provisioned on the Convex deployment
 *
 * Optional:
 *   E2E_CLERK_USER_EMAIL (default cash-forecast-e2e+clerk_test@example.com)
 *
 * Usage (from apps/cash-forecast):
 *   node scripts/ensure-clerk-e2e-user.mjs && node scripts/ensure-e2e-pro.mjs
 *   # or: vp run e2e:clerk-pro
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_EMAIL = 'cash-forecast-e2e+clerk_test@example.com'
const SECRET = process.env.CLERK_SECRET_KEY
const EMAIL = (process.env.E2E_CLERK_USER_EMAIL ?? DEFAULT_EMAIL).trim()
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactsDir = resolve(root, 'e2e/artifacts')
const userMetaPath = resolve(artifactsDir, 'e2e-user.json')
const envLocalPath = resolve(root, '.env.local')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

if (!SECRET) {
  fail(`Missing CLERK_SECRET_KEY (needed to resolve the E2E Clerk user id).`)
}

if (!existsSync(envLocalPath) || !readFileSync(envLocalPath, 'utf8').includes('CONVEX_DEPLOY_KEY=')) {
  fail(`Missing ${envLocalPath} with CONVEX_DEPLOY_KEY.
Recover with Convex Management API (team token) create_deploy_key for the cash-forecast
prod deployment, or re-run scripts/convex-provision.sh only on a fresh app.`)
}

async function clerkApi(method, path) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, json }
}

let userId = null
if (existsSync(userMetaPath)) {
  try {
    const meta = JSON.parse(readFileSync(userMetaPath, 'utf8'))
    if (meta?.id && meta?.email === EMAIL) userId = meta.id
  } catch {
    // fall through to Clerk API
  }
}

if (!userId) {
  const encoded = encodeURIComponent(EMAIL)
  const listed = await clerkApi('GET', `/users?email_address=${encoded}&limit=1`)
  if (!listed.ok) {
    fail(`Failed to list Clerk users: ${listed.status} ${JSON.stringify(listed.json)}`)
  }
  const existing = Array.isArray(listed.json) ? listed.json[0] : listed.json?.data?.[0]
  if (!existing?.id) {
    fail(
      `Clerk E2E user not found for ${EMAIL}. Run: node scripts/ensure-clerk-e2e-user.mjs`,
    )
  }
  userId = existing.id
}

const argsJson = JSON.stringify({ userId, email: EMAIL })
console.log(`Granting Pro to ${userId} <${EMAIL}> via admin:ensureE2ePro …`)

const result = spawnSync(
  'npx',
  ['convex', 'run', 'admin:ensureE2ePro', argsJson],
  {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  },
)

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)

if (result.status !== 0) {
  fail(`admin:ensureE2ePro failed (exit ${result.status})`)
}

mkdirSync(artifactsDir, { recursive: true })
const outPath = resolve(artifactsDir, 'e2e-pro.json')
const payload = {
  userId,
  email: EMAIL,
  rawStdout: (result.stdout ?? '').trim(),
  note: 'Stripe test-mode trial via Convex admin:ensureE2ePro (purpose=e2e metadata)',
}
writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n')
console.log(`Wrote ${outPath}`)
console.log('E2E user should now be Pro (trialing/active).')
