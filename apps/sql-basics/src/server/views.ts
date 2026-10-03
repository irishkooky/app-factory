// API の中身。Django でいう views.py にあたる。
// リクエストを読み、SQL を組み立てて DB（sandbox.ts）に送り、結果を JSON にして返す。
// 学習用に、同じことを Django で書いたコード（view）と、実際に走った SQL の記録（queries）を debug に添える。

import { env } from 'cloudflare:workers'
import { splitStatements, sqlErrorHint } from '../lib/sql'
import type {
  ApiBody,
  Category,
  ExecResult,
  SchemaEntry,
  SqlCell,
  SqlRunData,
  SqlValue,
  Task,
} from '../lib/types'
import { readSid } from './session'

function db(request: Request) {
  return env.SANDBOX.getByName(readSid(request.headers.get('cookie')) ?? 'anonymous')
}

function reply<T>(
  status: number,
  view: string,
  queries: ExecResult[],
  payload: { data?: T; error?: string; hint?: string },
): Response {
  const body: ApiBody<T> = { ...payload, debug: { view, queries } }
  return Response.json(body, { status })
}

function sqlFailed(view: string, q: ExecResult, status = 500): Response {
  const error = q.error ?? 'SQL の実行に失敗しました'
  return reply(status, view, [q], { error, hint: sqlErrorHint(error) })
}

/** Python のリテラルとして書く */
function py(v: string | number | boolean | null): string {
  if (v === null) return 'None'
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  if (typeof v === 'number') return String(v)
  return JSON.stringify(v)
}

const lines = (...ls: string[]) => ls.join('\n')

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const v: unknown = await request.json()
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function rowToTask(columns: string[], row: SqlCell[]): Task {
  const get = (name: string) => row[columns.indexOf(name)] ?? null
  const category = get('category_id')
  return {
    id: Number(get('id')),
    title: String(get('title') ?? ''),
    done: Number(get('done')) === 1,
    priority: Number(get('priority') ?? 2),
    category_id: category === null ? null : Number(category),
  }
}

// GET /api/tasks?done=0&category=1&q=買う&order=priority
export async function taskList(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const done = url.searchParams.get('done')
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')?.trim() ?? ''
  const order = url.searchParams.get('order')

  const where: string[] = []
  const params: SqlValue[] = []
  const filters: string[] = []
  if (done === '0' || done === '1') {
    where.push('done = ?')
    params.push(Number(done))
    filters.push(`done=${py(done === '1')}`)
  }
  if (category && /^\d+$/.test(category)) {
    where.push('category_id = ?')
    params.push(Number(category))
    filters.push(`category_id=${category}`)
  }
  if (q) {
    where.push('title LIKE ?')
    params.push(`%${q}%`)
    filters.push(`title__contains=${py(q)}`)
  }

  let sql = 'SELECT * FROM tasks'
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`
  let orderBy = ''
  if (order === 'new') {
    sql += ' ORDER BY id DESC'
    orderBy = 'order_by("-id")'
  } else if (order === 'priority') {
    sql += ' ORDER BY priority DESC'
    orderBy = 'order_by("-priority")'
  }

  const chain = [filters.length ? `filter(${filters.join(', ')})` : '', orderBy].filter(Boolean)
  const qs = `Task.objects.${chain.length ? chain.join('.') : 'all()'}`
  const view = lines(
    '# urls.py:  path("api/tasks", views.task_list)',
    'def task_list(request):',
    `    tasks = ${qs}`,
    '    return JsonResponse(list(tasks.values()), safe=False)',
  )

  const r = await db(request).run(sql, params)
  if (!r.ok) return sqlFailed(view, r)
  return reply<Task[]>(200, view, [r], { data: r.rows.map((row) => rowToTask(r.columns, row)) })
}

// POST /api/tasks  {"title": "...", "priority": 2, "category_id": 1}
export async function taskCreate(request: Request): Promise<Response> {
  const body = await readJson(request)
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const priority = [1, 2, 3].includes(Number(body.priority)) ? Number(body.priority) : 2
  const categoryId =
    typeof body.category_id === 'number' && Number.isInteger(body.category_id) && body.category_id > 0
      ? body.category_id
      : null

  const view = lines(
    '# urls.py:  path("api/tasks", views.task_create)  ← POST のとき',
    'def task_create(request):',
    '    data = json.loads(request.body)',
    '    if not data["title"]:',
    '        return JsonResponse({"error": "タイトルを入力してください"}, status=400)',
    `    task = Task.objects.create(title=${py(title)}, priority=${priority}, category_id=${py(categoryId)})`,
    '    return JsonResponse(model_to_dict(task), status=201)',
  )

  if (!title) return reply(400, view, [], { error: 'タイトルを入力してください' })
  if (title.length > 60) return reply(400, view, [], { error: 'タイトルは 60 文字までにしてください' })

  const sql = 'INSERT INTO tasks (title, priority, category_id) VALUES (?, ?, ?) RETURNING id'
  const r = await db(request).run(sql, [title, priority, categoryId])
  if (!r.ok) return sqlFailed(view, r)
  const id = Number(r.rows[0]?.[0])
  return reply<Task>(201, view, [r], {
    data: { id, title, done: false, priority, category_id: categoryId },
  })
}

// PATCH /api/tasks/3  {"done": true}
export async function taskUpdate(request: Request, idParam: string): Promise<Response> {
  const id = Number(idParam)
  const body = await readJson(request)
  const done = body.done === true
  const view = lines(
    '# urls.py:  path("api/tasks/<int:id>", views.task_update)',
    `def task_update(request, id):  # id = ${py(Number.isInteger(id) ? id : idParam)}`,
    `    Task.objects.filter(id=id).update(done=${py(done)})`,
    `    return JsonResponse({"id": id, "done": ${py(done)}})`,
  )
  if (!Number.isInteger(id) || typeof body.done !== 'boolean') {
    return reply(400, view, [], { error: 'id と done（true / false）が必要です' })
  }

  const r = await db(request).run('UPDATE tasks SET done = ? WHERE id = ?', [done ? 1 : 0, id])
  if (!r.ok) return sqlFailed(view, r)
  if ((r.matched.tasks ?? []).length === 0 && r.rowsWritten === 0) {
    return reply(404, view, [r], { error: `id = ${id} のタスクは見つかりませんでした` })
  }
  return reply(200, view, [r], { data: { id, done } })
}

// DELETE /api/tasks/3
export async function taskDelete(request: Request, idParam: string): Promise<Response> {
  const id = Number(idParam)
  const view = lines(
    '# urls.py:  path("api/tasks/<int:id>", views.task_delete)  ← DELETE のとき',
    `def task_delete(request, id):  # id = ${py(Number.isInteger(id) ? id : idParam)}`,
    '    Task.objects.filter(id=id).delete()',
    '    return JsonResponse({"deleted": id})',
  )
  if (!Number.isInteger(id)) return reply(400, view, [], { error: 'id は数字で指定してください' })

  const r = await db(request).run('DELETE FROM tasks WHERE id = ?', [id])
  if (!r.ok) return sqlFailed(view, r)
  if ((r.matched.tasks ?? []).length === 0 && r.rowsWritten === 0) {
    return reply(404, view, [r], { error: `id = ${id} のタスクは見つかりませんでした` })
  }
  return reply(200, view, [r], { data: { deleted: id } })
}

// GET /api/categories
export async function categoryList(request: Request): Promise<Response> {
  const view = lines(
    '# urls.py:  path("api/categories", views.category_list)',
    'def category_list(request):',
    '    categories = Category.objects.all()',
    '    return JsonResponse(list(categories.values()), safe=False)',
  )
  const r = await db(request).run('SELECT * FROM categories')
  if (!r.ok) return sqlFailed(view, r)
  const idx = (n: string) => r.columns.indexOf(n)
  return reply<Category[]>(200, view, [r], {
    data: r.rows.map((row) => ({ id: Number(row[idx('id')]), name: String(row[idx('name')] ?? '') })),
  })
}

// POST /api/sql  {"sql": "SELECT * FROM tasks"}
export async function runSql(request: Request): Promise<Response> {
  const body = await readJson(request)
  const sql = typeof body.sql === 'string' ? body.sql.trim() : ''
  const view = lines(
    '# urls.py:  path("api/sql", views.run_sql)',
    'from django.db import connection',
    '',
    'def run_sql(request):',
    '    sql = json.loads(request.body)["sql"]',
    '    with connection.cursor() as cursor:  # ORM を通さず SQL をそのまま送る',
    '        cursor.execute(sql)',
    '        rows = cursor.fetchall()',
    '    return JsonResponse({"rows": rows})',
  )
  if (!sql) return reply(400, view, [], { error: 'SQL を入力してください' })
  if (sql.length > 2000) return reply(400, view, [], { error: 'SQL は 2000 文字までにしてください' })
  const statements = splitStatements(sql)
  if (statements.length > 1) {
    return reply(400, view, [], {
      error: `SQL が ${statements.length} 文あります。1 回に 1 文ずつ実行してください`,
      hint: 'セミコロン ; は文の区切りです。1 つずつ実行すると、それぞれで何が起きたかが見えます。',
    })
  }

  const r = await db(request).run(statements[0] ?? sql)
  if (!r.ok) return sqlFailed(view, r, 400)
  return reply<SqlRunData>(200, view, [r], {
    data: {
      columns: r.columns,
      rows: r.rows,
      truncated: r.truncated,
      rowsRead: r.rowsRead,
      rowsWritten: r.rowsWritten,
    },
  })
}

// POST /api/reset
export async function resetDb(request: Request): Promise<Response> {
  const view = lines(
    '# Django なら管理コマンドで同じことをする',
    '#   python manage.py flush      … データを全部消す',
    '#   python manage.py migrate    … CREATE TABLE（テーブルを作る）',
    '#   python manage.py loaddata seed.json  … INSERT（初期データを入れる）',
  )
  const results = await db(request).reset()
  const failed = results.find((r) => !r.ok)
  if (failed) return reply(500, view, results, { error: failed.error })
  return reply(200, view, results, { data: { ok: true } })
}

// GET /api/schema
export async function schema(request: Request): Promise<Response> {
  const view = lines(
    '# Django なら: python manage.py sqlmigrate <app> 0001 で',
    '# models.py から作られる CREATE TABLE 文を確かめられる',
    'def schema(request):',
    '    with connection.cursor() as cursor:',
    '        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type = \'table\'")',
  )
  const r = await db(request).run(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  )
  if (!r.ok) return sqlFailed(view, r)
  return reply<SchemaEntry[]>(200, view, [r], {
    data: r.rows
      // ローカル開発（miniflare）が内部で作るテーブルは見せない
      .filter((row) => !String(row[0]).startsWith('__'))
      .map((row) => ({ name: String(row[0]), sql: String(row[1] ?? '') })),
  })
}
