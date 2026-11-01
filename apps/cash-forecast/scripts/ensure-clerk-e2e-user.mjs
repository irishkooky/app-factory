#!/usr/bin/env node
/**
 * Ensure a Clerk development test user exists for @clerk/testing Playwright sign-in.
 *
 * Uses the Backend API only — does not change the public Google-only SignIn UX.
 * Prefer a +clerk_test address so Clerk suppresses email delivery.
 *
 * Required env:
 *   CLERK_SECRET_KEY
 * Optional:
 *   E2E_CLERK_USER_EMAIL (default: cash-forecast-e2e+clerk_test@example.com)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_EMAIL = 'cash-forecast-e2e+clerk_test@example.com'
const SECRET = process.env.CLERK_SECRET_KEY
const EMAIL = (process.env.E2E_CLERK_USER_EMAIL ?? DEFAULT_EMAIL).trim()

if (!SECRET) {
  console.error(`Missing CLERK_SECRET_KEY.

Add these Cloud Agent / environment secrets (shared Clerk development instance):
  CLERK_SECRET_KEY
  CLERK_PUBLISHABLE_KEY
  E2E_CLERK_USER_EMAIL   (optional; default ${DEFAULT_EMAIL})

Dashboard (optional manual path if API create fails):
  1. Clerk Dashboard → Users → Create user
  2. Email: ${DEFAULT_EMAIL}  (+clerk_test suppresses delivery)
  3. No need to enable Email as a public sign-in method —
     clerk.signIn({ emailAddress }) uses the Backend API token path.
`)
  process.exit(1)
}

if (!EMAIL.includes('+clerk_test@') && !EMAIL.includes('+clerk_test')) {
  console.warn(
    `Warning: E2E_CLERK_USER_EMAIL=${EMAIL} does not use the +clerk_test pattern; Clerk may send real emails.`,
  )
}

async function clerkApi(method, path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

const encoded = encodeURIComponent(EMAIL)
const listed = await clerkApi('GET', `/users?email_address=${encoded}&limit=1`)
if (!listed.ok) {
  console.error('Failed to list Clerk users:', listed.status, listed.json)
  process.exit(1)
}

const existing = Array.isArray(listed.json) ? listed.json[0] : listed.json?.data?.[0]
let user = existing

if (!user) {
  const created = await clerkApi('POST', '/users', {
    email_address: [EMAIL],
    skip_password_requirement: true,
    skip_password_checks: true,
  })
  if (!created.ok) {
    console.error('Failed to create Clerk E2E user:', created.status, created.json)
    console.error(`
If create is rejected, create the user in Clerk Dashboard → Users with email ${EMAIL},
then re-run. Public sign-in can stay Google-only; Backend API sign-in does not need Email enabled.
`)
    process.exit(1)
  }
  user = created.json
  console.log(`Created Clerk E2E user ${user.id} <${EMAIL}>`)
} else {
  console.log(`Clerk E2E user already exists ${user.id} <${EMAIL}>`)
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../e2e/artifacts')
mkdirSync(outDir, { recursive: true })
const metaPath = resolve(outDir, 'e2e-user.json')
writeFileSync(
  metaPath,
  JSON.stringify(
    {
      id: user.id,
      email: EMAIL,
      createdAt: user.created_at ?? null,
      note: 'Development instance test user for @clerk/testing clerk.signIn({ emailAddress })',
    },
    null,
    2,
  ) + '\n',
)
console.log(`Wrote ${metaPath}`)
console.log(`E2E_CLERK_USER_EMAIL=${EMAIL}`)
