// SQL を「読む」ための小さな道具（サーバーと画面の両方で使う）
// 本物のパーサーではない。初心者が書く素直な SQL を、句（SELECT / FROM / WHERE ...）に分けて
// 色分け・日本語の説明・DB の処理順・該当行の割り出しに使えれば十分、という割り切りで作っている。

import type { SqlValue, StatementKind } from './types'

type TokenType =
  | 'space'
  | 'comment'
  | 'word'
  | 'ident'
  | 'string'
  | 'number'
  | 'param'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'semi'
  | 'op'

type Token = { type: TokenType; text: string }

const isSpace = (c: string) => /\s/.test(c)
const isWordStart = (c: string) => /[A-Za-z_\u0080-￿]/.test(c)
const isWordPart = (c: string) => /[A-Za-z0-9_$\u0080-￿]/.test(c)

function tokenize(sql: string): Token[] {
  const out: Token[] = []
  const n = sql.length
  let i = 0
  const push = (type: TokenType, end: number) => {
    out.push({ type, text: sql.slice(i, end) })
    i = end
  }
  while (i < n) {
    const c = sql[i]
    const next = sql[i + 1] ?? ''
    if (isSpace(c)) {
      let j = i + 1
      while (j < n && isSpace(sql[j])) j++
      push('space', j)
    } else if (c === '-' && next === '-') {
      const j = sql.indexOf('\n', i)
      push('comment', j === -1 ? n : j)
    } else if (c === '/' && next === '*') {
      const j = sql.indexOf('*/', i + 2)
      push('comment', j === -1 ? n : j + 2)
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < n) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) {
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      push(c === "'" ? 'string' : 'ident', Math.min(j, n))
    } else if (c === '[') {
      const j = sql.indexOf(']', i)
      push('ident', j === -1 ? n : j + 1)
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(next))) {
      let j = i + 1
      while (j < n && /[0-9.]/.test(sql[j])) j++
      push('number', j)
    } else if (c === '?') {
      let j = i + 1
      while (j < n && /[0-9]/.test(sql[j])) j++
      push('param', j)
    } else if (isWordStart(c)) {
      let j = i + 1
      while (j < n && isWordPart(sql[j])) j++
      push('word', j)
    } else if (c === '(') {
      push('lparen', i + 1)
    } else if (c === ')') {
      push('rparen', i + 1)
    } else if (c === ',') {
      push('comma', i + 1)
    } else if (c === ';') {
      push('semi', i + 1)
    } else {
      const two = sql.slice(i, i + 2)
      push('op', ['<=', '>=', '<>', '!=', '==', '||'].includes(two) ? i + 2 : i + 1)
    }
  }
  return out
}

const isBlank = (t: Token) => t.type === 'space' || t.type === 'comment'

/** セミコロンで文を分ける（文字列の中の ; は無視）。空の文は捨てる */
export function splitStatements(sql: string): string[] {
  const out: string[] = []
  let cur: Token[] = []
  const flush = () => {
    if (cur.some((t) => !isBlank(t))) out.push(cur.map((t) => t.text).join('').trim())
    cur = []
  }
  for (const t of tokenize(sql)) {
    if (t.type === 'semi') flush()
    else cur.push(t)
  }
  flush()
  return out
}

function firstWord(sql: string): string {
  const t = tokenize(sql).find((x) => !isBlank(x))
  return t && t.type === 'word' ? t.text.toUpperCase() : ''
}

export function statementKind(sql: string): StatementKind {
  switch (firstWord(sql)) {
    case 'SELECT':
    case 'WITH':
    case 'VALUES':
      return 'select'
    case 'INSERT':
    case 'REPLACE':
      return 'insert'
    case 'UPDATE':
      return 'update'
    case 'DELETE':
      return 'delete'
    case 'CREATE':
      return 'create'
    case 'DROP':
      return 'drop'
    case 'ALTER':
      return 'alter'
    default:
      return 'other'
  }
}

/** 値を SQL の書き方にする（文字列は '...' で囲み、' は '' にする） */
export function formatValue(v: SqlValue): string {
  if (v === null) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${v.replace(/'/g, "''")}'`
}

/** プレースホルダ ? に値を埋め込んだ「読みやすい形」を作る（表示と行の割り出し用） */
export function inlineParams(sql: string, params: SqlValue[]): string {
  if (params.length === 0) return sql
  let next = 0
  return tokenize(sql)
    .map((t) => {
      if (t.type !== 'param') return t.text
      const idx = t.text.length > 1 ? Number(t.text.slice(1)) - 1 : next++
      return idx >= 0 && idx < params.length ? formatValue(params[idx]) : t.text
    })
    .join('')
}

// ---------------------------------------------------------------------------
// 句（clause）に分ける

export type Clause = {
  /** 正規化したキーワード（例: 'ORDER BY', 'LEFT JOIN'） */
  key: string
  /** 書かれていたとおりのキーワード */
  keyword: string
  body: string
}

const STARTERS: string[][] = [
  ['WITH'],
  ['SELECT'],
  ['FROM'],
  ['LEFT', 'OUTER', 'JOIN'],
  ['LEFT', 'JOIN'],
  ['RIGHT', 'OUTER', 'JOIN'],
  ['RIGHT', 'JOIN'],
  ['FULL', 'OUTER', 'JOIN'],
  ['FULL', 'JOIN'],
  ['INNER', 'JOIN'],
  ['CROSS', 'JOIN'],
  ['NATURAL', 'JOIN'],
  ['JOIN'],
  ['ON'],
  ['WHERE'],
  ['GROUP', 'BY'],
  ['HAVING'],
  ['ORDER', 'BY'],
  ['LIMIT'],
  ['OFFSET'],
  ['UNION', 'ALL'],
  ['UNION'],
  ['INTERSECT'],
  ['EXCEPT'],
  ['INSERT', 'OR', 'REPLACE', 'INTO'],
  ['INSERT', 'OR', 'IGNORE', 'INTO'],
  ['INSERT', 'INTO'],
  ['REPLACE', 'INTO'],
  ['VALUES'],
  ['RETURNING'],
  ['UPDATE'],
  ['SET'],
  ['DELETE', 'FROM'],
]

/** キーワードの系統（色と説明はこの単位で決める） */
export function clauseGroup(key: string): string {
  if (key.endsWith('JOIN')) return 'JOIN'
  if (key.startsWith('INSERT') || key === 'REPLACE INTO') return 'INSERT INTO'
  if (key.startsWith('UNION') || key === 'INTERSECT' || key === 'EXCEPT') return 'UNION'
  return key
}

const DDL_KINDS: StatementKind[] = ['create', 'drop', 'alter', 'other']

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

export function splitClauses(sql: string): Clause[] {
  const tokens = tokenize(sql).filter((t) => t.type !== 'comment' && t.type !== 'semi')
  const kind = statementKind(sql)

  if (DDL_KINDS.includes(kind)) {
    // CREATE TABLE などは 1 つの句として扱う（中身の改行はそのまま残す）
    const words = tokens.filter((t) => !isBlank(t))
    const head = words.slice(0, kind === 'other' ? 1 : 2)
    if (head.length === 0) return []
    const lastHead = tokens.indexOf(head[head.length - 1])
    return [
      {
        key: head.map((t) => t.text.toUpperCase()).join(' '),
        keyword: head.map((t) => t.text).join(' '),
        body: tokens
          .slice(lastHead + 1)
          .map((t) => t.text)
          .join('')
          .trim(),
      },
    ]
  }

  const clauses: Clause[] = []
  let current: { key: string; keyword: string; body: Token[] } | null = null
  let depth = 0
  let i = 0
  const lead: Token[] = []

  const matchStarter = (at: number): { words: Token[]; end: number } | null => {
    for (const pattern of STARTERS) {
      const words: Token[] = []
      let j = at
      let ok = true
      for (let k = 0; k < pattern.length; k++) {
        while (k > 0 && j < tokens.length && isBlank(tokens[j])) j++
        const t = tokens[j]
        if (!t || t.type !== 'word' || t.text.toUpperCase() !== pattern[k]) {
          ok = false
          break
        }
        words.push(t)
        j++
      }
      if (ok) return { words, end: j }
    }
    return null
  }

  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'lparen') depth++
    if (t.type === 'rparen') depth = Math.max(0, depth - 1)
    if (depth === 0 && t.type === 'word') {
      const m = matchStarter(i)
      if (m) {
        if (current) {
          clauses.push({
            key: current.key,
            keyword: current.keyword,
            body: collapse(current.body.map((x) => x.text).join('')),
          })
        }
        current = {
          key: m.words.map((w) => w.text.toUpperCase()).join(' '),
          keyword: m.words.map((w) => w.text).join(' '),
          body: [],
        }
        i = m.end
        continue
      }
    }
    if (current) current.body.push(t)
    else lead.push(t)
    i++
  }
  if (current) {
    clauses.push({
      key: current.key,
      keyword: current.keyword,
      body: collapse(current.body.map((x) => x.text).join('')),
    })
  }
  if (lead.some((t) => !isBlank(t))) {
    clauses.unshift({ key: '', keyword: '', body: collapse(lead.map((x) => x.text).join('')) })
  }
  return clauses
}

/** 括弧の外にあるカンマで区切る */
function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const t of tokenize(body)) {
    if (t.type === 'lparen') depth++
    if (t.type === 'rparen') depth = Math.max(0, depth - 1)
    if (t.type === 'comma' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += t.text
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

// ---------------------------------------------------------------------------
// 色と日本語の説明

export const CLAUSE_COLORS: Record<string, string> = {
  WITH: 'gray',
  SELECT: 'blue',
  FROM: 'grape',
  JOIN: 'violet',
  ON: 'violet',
  WHERE: 'orange',
  'GROUP BY': 'cyan',
  HAVING: 'cyan',
  'ORDER BY': 'teal',
  LIMIT: 'pink',
  OFFSET: 'pink',
  UNION: 'gray',
  'INSERT INTO': 'green',
  VALUES: 'green',
  RETURNING: 'lime',
  UPDATE: 'yellow',
  SET: 'yellow',
  'DELETE FROM': 'red',
  'CREATE TABLE': 'indigo',
  'CREATE INDEX': 'indigo',
  'DROP TABLE': 'red',
  'ALTER TABLE': 'indigo',
}

export function clauseColor(key: string): string {
  return CLAUSE_COLORS[clauseGroup(key)] ?? 'gray'
}

/** このアプリの列の意味（説明文に添える） */
function annotate(cond: string): string {
  return cond
    .replace(/\bdone\s*=\s*0\b/gi, '$&（未完了）')
    .replace(/\bdone\s*=\s*1\b/gi, '$&（完了）')
    .replace(/LIKE\s+'%([^'%]*)%'/gi, "$&（「$1」を含む）")
}

const AGG: [RegExp, (arg: string) => string][] = [
  [/^COUNT\s*\(\s*\*\s*\)$/i, () => '行の数'],
  [/^COUNT\s*\(\s*DISTINCT\s+(.+)\)$/i, (a) => `${a} の種類の数`],
  [/^COUNT\s*\((.+)\)$/i, (a) => `${a} が空でない行の数`],
  [/^SUM\s*\((.+)\)$/i, (a) => `${a} の合計`],
  [/^TOTAL\s*\((.+)\)$/i, (a) => `${a} の合計`],
  [/^AVG\s*\((.+)\)$/i, (a) => `${a} の平均`],
  [/^MAX\s*\((.+)\)$/i, (a) => `${a} の最大値`],
  [/^MIN\s*\((.+)\)$/i, (a) => `${a} の最小値`],
  [/^GROUP_CONCAT\s*\((.+)\)$/i, (a) => `${a} をつなげた文字`],
]

function describeSelectItem(item: string): string {
  let expr = item
  let alias = ''
  const m = item.match(/^(.*\S)\s+AS\s+(\S+)$/i)
  if (m) {
    expr = m[1]
    alias = m[2]
  }
  let desc = expr
  if (expr === '*') desc = 'すべての列'
  else if (/^\S+\.\*$/.test(expr)) desc = `${expr.slice(0, -2)} のすべての列`
  else {
    for (const [re, f] of AGG) {
      const a = expr.match(re)
      if (a) {
        desc = f(a[1]?.trim() ?? '')
        break
      }
    }
  }
  return alias ? `${desc}（${alias} という名前で）` : desc
}

function describeOrder(body: string): string {
  return splitTopLevel(body)
    .map((part) => {
      const m = part.match(/^(.*?)\s+(ASC|DESC)$/i)
      const col = m ? m[1] : part
      const desc = m ? m[2].toUpperCase() === 'DESC' : false
      return desc ? `${col} の大きい順（降順）` : `${col} の小さい順（昇順）`
    })
    .join('、同じなら ')
}

function tableName(body: string): string {
  return body.split(/[\s(]/)[0] ?? body
}

export function explainClause(c: Clause, kind: StatementKind): string {
  const b = c.body
  switch (clauseGroup(c.key)) {
    case 'SELECT': {
      const distinct = /^DISTINCT\s+/i.test(b)
      const items = splitTopLevel(distinct ? b.replace(/^DISTINCT\s+/i, '') : b)
      return `${distinct ? '重複をなくして、' : ''}${items.map(describeSelectItem).join('、')} を取り出す`
    }
    case 'FROM': {
      if (kind !== 'select') return ''
      if (b.startsWith('(')) return 'カッコの中の SELECT の結果を、表として使う'
      const parts = splitTopLevel(b).map((p) => {
        const m = p.match(/^(\S+)\s+(?:AS\s+)?(\S+)$/i)
        return m ? `${m[1]} テーブル（以下 ${m[2]} と呼ぶ）` : `${p} テーブル`
      })
      return `${parts.join(' と ')}から`
    }
    case 'JOIN': {
      const t = tableName(b)
      return c.key.startsWith('LEFT')
        ? `${t} テーブルを横にくっつける（相手が見つからない行も消さずに残す）`
        : `${t} テーブルを横にくっつける`
    }
    case 'ON':
      return `${annotate(b)} が一致する行どうしをつなぐ`
    case 'WHERE':
      if (kind === 'update') return `書き換えるのは ${annotate(b)} の行だけ`
      if (kind === 'delete') return `消すのは ${annotate(b)} の行だけ`
      return `${annotate(b)} に当てはまる行だけに絞る`
    case 'GROUP BY':
      return `${b} が同じ行どうしを 1 つのグループにまとめる`
    case 'HAVING':
      return `まとめたグループのうち、${b} のものだけ残す`
    case 'ORDER BY':
      return `${describeOrder(b)}に並べる`
    case 'LIMIT': {
      const m = b.match(/^(\S+)\s+OFFSET\s+(\S+)$/i)
      return m ? `${m[2]} 行とばして、最大 ${m[1]} 行まで` : `最大 ${b} 行まで`
    }
    case 'OFFSET':
      return `先頭から ${b} 行とばす`
    case 'INSERT INTO': {
      const m = b.match(/^(\S+)\s*\((.*)\)$/)
      return m
        ? `${m[1]} テーブルに新しい行を追加する（値を入れる列: ${m[2]}）`
        : `${tableName(b)} テーブルに新しい行を追加する`
    }
    case 'VALUES': {
      const rows = splitTopLevel(b)
      return rows.length > 1
        ? `入れる値（${rows.length} 行分）。列の並びと同じ順番で対応する`
        : '入れる値。列の並びと同じ順番で対応する'
    }
    case 'RETURNING':
      return `処理した行の ${b} を結果として返してもらう`
    case 'UPDATE':
      return `${tableName(b)} テーブルの行を書き換える`
    case 'SET':
      return `${splitTopLevel(b)
        .map((p) => {
          const m = p.match(/^(\S+)\s*=\s*(.+)$/)
          return m ? `${m[1]} を ${annotate(`${m[1]} = ${m[2]}`).slice(m[1].length + 3)} に` : p
        })
        .join('、')}する`
    case 'DELETE FROM':
      return `${tableName(b)} テーブルから行を消す`
    case 'WITH':
      return '名前つきの一時的な結果を先に作っておく'
    case 'UNION':
      return c.key === 'UNION ALL'
        ? '前後の SELECT の結果を縦につなげる（重複もそのまま）'
        : '前後の SELECT の結果を縦につなげる'
    case 'CREATE TABLE':
      return `${tableName(b.replace(/^IF NOT EXISTS\s+/i, ''))} という新しいテーブル（表）を作る`
    case 'CREATE INDEX':
      return '検索を速くするための索引（インデックス）を作る'
    case 'DROP TABLE':
      return `${tableName(b.replace(/^IF EXISTS\s+/i, ''))} テーブルを中身ごと消す`
    case 'ALTER TABLE':
      return `${tableName(b)} テーブルの形を変える（列を足す・名前を変えるなど）`
    default:
      return ''
  }
}

const LOGICAL_ORDER: Record<string, number> = {
  WITH: 0,
  FROM: 1,
  JOIN: 2,
  ON: 2,
  WHERE: 3,
  'GROUP BY': 4,
  HAVING: 5,
  SELECT: 6,
  'ORDER BY': 7,
  LIMIT: 8,
  OFFSET: 8,
}

/** SELECT を DB が実際に考える順番に並べ直す。対象外なら null */
export function logicalOrder(clauses: Clause[]): Clause[] | null {
  if (clauses.length < 2) return null
  if (clauses.some((c) => !(clauseGroup(c.key) in LOGICAL_ORDER))) return null
  if (!clauses.some((c) => c.key === 'SELECT')) return null
  return [...clauses].sort(
    (a, b) => LOGICAL_ORDER[clauseGroup(a.key)] - LOGICAL_ORDER[clauseGroup(b.key)],
  )
}

/** 識別子の引用符を外して小文字にする */
function normName(raw: string): string {
  const s = raw.replace(/^["`[]|["`\]]$/g, '')
  return s.toLowerCase()
}

const NOT_TABLE = new Set(['IF', 'NOT', 'EXISTS', 'SELECT', 'OR', 'REPLACE', 'IGNORE', 'ONLY'])

/** SQL の中で使われているテーブル名（小文字）。サブクエリの中も拾う */
export function referencedTables(sql: string): string[] {
  const tokens = tokenize(sql).filter((t) => !isBlank(t))
  const found: string[] = []
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i]
    if (t.type !== 'word' || !['FROM', 'JOIN', 'INTO', 'UPDATE', 'TABLE'].includes(t.text.toUpperCase())) continue
    let j = i + 1
    while (j < tokens.length && tokens[j].type === 'word' && NOT_TABLE.has(tokens[j].text.toUpperCase())) j++
    const n = tokens[j]
    if (n && (n.type === 'word' || n.type === 'ident')) {
      const name = normName(n.text)
      if (!found.includes(name)) found.push(name)
    }
  }
  return found
}

type TableRef = { table: string; ref: string; raw: string }

/** "tasks" / "tasks t" / "tasks AS t" を読む。それ以外の形なら null */
function parseTableRef(body: string): TableRef | null {
  const toks = tokenize(body).filter((t) => !isBlank(t))
  const isName = (t?: Token) => !!t && (t.type === 'word' || t.type === 'ident')
  if (!isName(toks[0])) return null
  if (toks.length === 1) return { table: normName(toks[0].text), ref: toks[0].text, raw: body }
  if (toks.length === 2 && isName(toks[1])) {
    return { table: normName(toks[0].text), ref: toks[1].text, raw: body }
  }
  if (toks.length === 3 && toks[1].text.toUpperCase() === 'AS' && isName(toks[2])) {
    return { table: normName(toks[0].text), ref: toks[2].text, raw: body }
  }
  return null
}

/**
 * 「どの行が選ばれたか」を割り出すための SELECT を作る。
 * 例: SELECT title FROM tasks WHERE done = 0 → SELECT tasks.rowid AS __r0 FROM tasks WHERE done = 0
 * UPDATE / DELETE は実行前に同じ WHERE で対象行を数えるのに使う。
 * 形が複雑で割り出せないときは null（そのときは色付けをあきらめる）。
 */
export function buildMatchQuery(sql: string): { sql: string; tables: string[] } | null {
  if (splitStatements(sql).length !== 1) return null
  const kind = statementKind(sql)
  const clauses = splitClauses(sql)
  const groups = clauses.map((c) => clauseGroup(c.key))

  if (kind === 'select') {
    if (clauses[0]?.key !== 'SELECT') return null
    if (groups.some((g) => g === 'WITH' || g === 'UNION' || g === 'HAVING' || g === '')) return null
    if (/^DISTINCT\b/i.test(clauses[0].body)) return null
    const refs: TableRef[] = []
    for (const c of clauses) {
      const g = clauseGroup(c.key)
      if (g === 'FROM' || g === 'JOIN') {
        const r = parseTableRef(c.body)
        if (!r) return null
        refs.push(r)
      }
    }
    if (refs.length === 0) return null
    const aggregated =
      groups.includes('GROUP BY') ||
      /\b(COUNT|SUM|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/i.test(clauses[0].body)
    const keep = new Set(['FROM', 'JOIN', 'ON', 'WHERE'])
    if (!aggregated) ['ORDER BY', 'LIMIT', 'OFFSET'].forEach((k) => keep.add(k))
    const rest = clauses
      .filter((c) => keep.has(clauseGroup(c.key)))
      .map((c) => `${c.keyword} ${c.body}`)
      .join(' ')
    const list = refs.map((r, i) => `${r.ref}.rowid AS __r${i}`).join(', ')
    return { sql: `SELECT ${list} ${rest}`, tables: refs.map((r) => r.table) }
  }

  if (kind === 'update' || kind === 'delete') {
    const head = clauses[0]
    if (!head || (kind === 'update' ? head.key !== 'UPDATE' : head.key !== 'DELETE FROM')) return null
    if (groups.some((g) => g === 'FROM' || g === 'ORDER BY' || g === 'LIMIT' || g === 'WITH')) return null
    const r = parseTableRef(head.body)
    if (!r) return null
    const where = clauses.find((c) => c.key === 'WHERE')
    return {
      sql: `SELECT rowid AS __r0 FROM ${r.raw}${where ? ` WHERE ${where.body}` : ''}`,
      tables: [r.table],
    }
  }
  return null
}

/** UPDATE / DELETE に WHERE が無い（＝全行が対象になる） */
export function missingWhere(sql: string): boolean {
  const kind = statementKind(sql)
  if (kind !== 'update' && kind !== 'delete') return false
  return !splitClauses(sql).some((c) => c.key === 'WHERE')
}

/** SQLite のエラーメッセージに初心者向けのヒントを付ける */
export function sqlErrorHint(message: string): string | undefined {
  const m = message.toLowerCase()
  if (m.includes('no such table')) {
    return 'そんな名前のテーブルはありません。テーブル名のつづりを確かめてください（このラボにあるのは tasks と categories）。消してしまったなら「DB を初期状態に戻す」で元に戻せます。'
  }
  if (m.includes('no such column')) {
    return 'そんな名前の列はありません。列名のつづりを確かめてください。文字を値として書くなら \'牛乳\' のようにシングルクォートで囲みます。'
  }
  if (m.includes('syntax error') || m.includes('incomplete input')) {
    return '文法のまちがいです。キーワードの順番（SELECT → FROM → WHERE → ORDER BY）、カンマ、カッコ、クォートの閉じ忘れを確かめてください。'
  }
  if (m.includes('not null constraint')) {
    return 'NOT NULL（空っぽ禁止）の列に値が入っていません。INSERT のときはその列にも値を入れてください。'
  }
  if (m.includes('foreign key constraint')) {
    return '外部キーの約束違反です。存在しないカテゴリの番号を入れたか、まだタスクから使われているカテゴリを消そうとしました。'
  }
  if (m.includes('unique constraint')) {
    return '同じ値が既にあります（UNIQUE / 主キーは重複できません）。'
  }
  if (m.includes('values for') && m.includes('columns')) {
    return '列の数と VALUES の値の数が合っていません。'
  }
  if (m.includes('not authorized')) {
    return 'このラボの DB では使えない命令です。'
  }
  return undefined
}
