// 訪問者 1 人につき 1 つ作られる SQLite データベース（Cloudflare Durable Object）
// Django の構成でいうと「DB サーバー」の役。views.ts から SQL を受け取って実行し、
// 学習用に「実行前後でテーブルがどう変わったか」「どの行が選ばれたか」も記録して返す。

import { DurableObject } from 'cloudflare:workers'
import { buildMatchQuery, inlineParams, splitStatements, statementKind } from '../lib/sql'
import type { ExecResult, SqlCell, SqlValue, TableChanges, TableSnapshot } from '../lib/types'
import { SEED_STATEMENTS } from './seed'

const SNAPSHOT_LIMIT = 100
const RESULT_LIMIT = 200
/** 最後の操作からこの期間が過ぎたら DB ごと片付ける */
const IDLE_TTL_MS = 14 * 24 * 60 * 60 * 1000

const toCell = (v: unknown): SqlCell => {
  if (v === null || typeof v === 'number' || typeof v === 'string') return v
  if (v instanceof ArrayBuffer) return `<BLOB ${v.byteLength} bytes>`
  return String(v)
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`

const cleanError = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).replace(/:\s*SQLITE_[A-Z_]+(\s*\(extended:[^)]*\))?\s*$/, '').trim()

export class SqlSandbox extends DurableObject<Env> {
  private ensureSeeded() {
    if (this.ctx.storage.kv.get('seeded')) return
    for (const s of SEED_STATEMENTS) this.ctx.storage.sql.exec(s)
    this.ctx.storage.kv.put('seeded', true)
  }

  /** SQL を 1 文実行して、学習用の記録つきで返す */
  async run(sql: string, params: SqlValue[] = []): Promise<ExecResult> {
    this.ensureSeeded()
    await this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS)
    return this.execTraced(sql, params)
  }

  /** 全部消して初期データを入れ直す */
  async reset(): Promise<ExecResult[]> {
    await this.ctx.storage.deleteAll()
    const results = SEED_STATEMENTS.map((s) => this.execTraced(s, [], { snapshot: false }))
    this.ctx.storage.kv.put('seeded', true)
    await this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS)
    const last = results[results.length - 1]
    if (last) last.tables = this.snapshot()
    return results
  }

  async alarm() {
    await this.ctx.storage.deleteAll()
  }

  private execTraced(sql: string, params: SqlValue[], opts = { snapshot: true }): ExecResult {
    const kind = statementKind(sql)
    const result: ExecResult = {
      sql,
      params,
      kind,
      ok: true,
      columns: [],
      rows: [],
      truncated: false,
      rowsRead: 0,
      rowsWritten: 0,
      changes: {},
      matched: {},
      createdTables: [],
      droppedTables: [],
    }

    if (splitStatements(sql).length > 1) {
      result.ok = false
      result.error = 'SQL は 1 回に 1 文ずつ実行してください'
      return result
    }

    const writes = kind !== 'select'
    const before = opts.snapshot && writes ? this.snapshot() : null
    const match = buildMatchQuery(inlineParams(sql, params))
    // UPDATE / DELETE は実行すると行が変わる・消えるので、先に対象行を数えておく
    if (opts.snapshot && match && kind !== 'select') result.matched = this.findMatched(match)

    try {
      const cursor = this.ctx.storage.sql.exec(sql, ...params)
      for (const row of cursor.raw()) {
        if (result.rows.length >= RESULT_LIMIT) {
          result.truncated = true
          break
        }
        result.rows.push(row.map(toCell))
      }
      result.columns = cursor.columnNames
      result.rowsRead = cursor.rowsRead
      result.rowsWritten = cursor.rowsWritten
    } catch (e) {
      result.ok = false
      result.error = cleanError(e)
    }

    if (!opts.snapshot) return result
    if (result.ok && match && kind === 'select') result.matched = this.findMatched(match)
    const after = this.snapshot()
    result.tables = after
    if (before && result.ok) this.diff(before, after, result)
    return result
  }

  private findMatched(match: { sql: string; tables: string[] }): Record<string, number[]> {
    const names = this.tableNames()
    const out: Record<string, number[]> = {}
    try {
      const rows = [...this.ctx.storage.sql.exec(match.sql).raw()]
      match.tables.forEach((t, i) => {
        const actual = names.find((n) => n.toLowerCase() === t)
        if (!actual) return
        const ids = out[actual] ?? []
        for (const r of rows) {
          const v = r[i]
          if (typeof v === 'number' && !ids.includes(v)) ids.push(v)
        }
        out[actual] = ids
      })
    } catch {
      // 割り出せなかったら色付けしないだけ
    }
    return out
  }

  private tableNames(): string[] {
    return this.ctx.storage.sql
      .exec<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND substr(name, 1, 7) != 'sqlite_' AND substr(name, 1, 4) != '_cf_' AND substr(name, 1, 2) != '__' ORDER BY name",
      )
      .toArray()
      .map((r) => r.name)
  }

  private snapshot(): TableSnapshot[] {
    return this.tableNames().map((name) => {
      const q = quoteIdent(name)
      const total = Number(this.ctx.storage.sql.exec(`SELECT COUNT(*) FROM ${q}`).raw().next().value?.[0] ?? 0)
      try {
        const cur = this.ctx.storage.sql.exec(`SELECT rowid AS __rowid__, * FROM ${q} ORDER BY rowid LIMIT ?`, SNAPSHOT_LIMIT)
        const raw = [...cur.raw()]
        return {
          name,
          columns: cur.columnNames.slice(1),
          rows: raw.map((r) => r.slice(1).map(toCell)),
          rowids: raw.map((r) => Number(r[0])),
          total,
        }
      } catch {
        // WITHOUT ROWID テーブルなど
        const cur = this.ctx.storage.sql.exec(`SELECT * FROM ${q} LIMIT ?`, SNAPSHOT_LIMIT)
        const raw = [...cur.raw()]
        return { name, columns: cur.columnNames, rows: raw.map((r) => r.map(toCell)), rowids: null, total }
      }
    })
  }

  private diff(before: TableSnapshot[], after: TableSnapshot[], result: ExecResult) {
    for (const t of after) {
      const b = before.find((x) => x.name === t.name)
      if (!b) {
        result.createdTables.push(t.name)
        continue
      }
      if (!t.rowids || !b.rowids) continue
      const bRows = new Map(b.rowids.map((id, i) => [id, b.rows[i]]))
      const aIds = new Set(t.rowids)
      const sameColumns = b.columns.join('\u0000') === t.columns.join('\u0000')
      const ch: TableChanges = { inserted: [], updated: [], deleted: [] }
      t.rowids.forEach((id, i) => {
        const prev = bRows.get(id)
        if (!prev) {
          ch.inserted.push(id)
          return
        }
        if (!sameColumns) return
        const cols = t.columns.filter((_, k) => !Object.is(prev[k], t.rows[i][k]))
        if (cols.length) ch.updated.push({ rowid: id, cols, before: prev })
      })
      b.rowids.forEach((id, i) => {
        if (!aIds.has(id)) ch.deleted.push({ rowid: id, row: b.rows[i] })
      })
      if (ch.inserted.length || ch.updated.length || ch.deleted.length) result.changes[t.name] = ch
    }
    for (const b of before) {
      if (!after.some((t) => t.name === b.name)) result.droppedTables.push(b.name)
    }
  }
}
