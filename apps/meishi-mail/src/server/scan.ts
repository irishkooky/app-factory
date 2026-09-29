import { createServerFn } from '@tanstack/react-start'
import { cleanEmails } from '../lib/email'
import type { CardInfo } from '../lib/types'
import { generateJson } from './gemini'

const MAX_BASE64_LENGTH = 6_000_000
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ScanInput {
  imageBase64: string
  mimeType: string
}

const PROMPT = `あなたは名刺の読み取り担当です。画像の名刺から次の項目を抽出して JSON で返してください。
- 読めない・書かれていない項目は空文字（配列なら空配列）にする。推測で埋めない
- name は氏名。日本語表記があれば日本語を優先し、姓と名の間は半角スペース1つ
- emails は名刺に印字されたメールアドレスをすべて。全角文字は半角にする
- 名刺が回転していたり、表裏が写っていても読み取る
- 名刺が写っていなければすべて空にする`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    company: { type: 'STRING' },
    department: { type: 'STRING' },
    title: { type: 'STRING' },
    emails: { type: 'ARRAY', items: { type: 'STRING' } },
    phones: { type: 'ARRAY', items: { type: 'STRING' } },
    website: { type: 'STRING' },
    address: { type: 'STRING' },
  },
  required: ['name', 'company', 'department', 'title', 'emails', 'phones', 'website', 'address'],
}

function validateScanInput(data: ScanInput): ScanInput {
  const input: unknown = data
  if (!input || typeof input !== 'object') throw new Error('不正なリクエストです')
  const { imageBase64, mimeType } = input as Record<string, unknown>
  if (typeof mimeType !== 'string' || !MIME_TYPES.includes(mimeType)) {
    throw new Error('画像の形式が不正です（JPEG / PNG / WebP）')
  }
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) throw new Error('画像がありません')
  if (imageBase64.length > MAX_BASE64_LENGTH) throw new Error('画像が大きすぎます')
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) throw new Error('画像データが不正です')
  return { imageBase64, mimeType }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str).filter((v) => v !== '') : []
}

export const scanCard = createServerFn({ method: 'POST' })
  .inputValidator(validateScanInput)
  .handler(async ({ data }): Promise<CardInfo> => {
    const raw = await generateJson(
      [{ inline_data: { mime_type: data.mimeType, data: data.imageBase64 } }, { text: PROMPT }],
      SCHEMA,
    )
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      name: str(r.name),
      company: str(r.company),
      department: str(r.department),
      title: str(r.title),
      emails: cleanEmails(strArray(r.emails)),
      phones: strArray(r.phones),
      website: str(r.website),
      address: str(r.address),
    }
  })
