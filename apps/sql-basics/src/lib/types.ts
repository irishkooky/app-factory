// サーバー（API・DB）と画面の両方で使う型

/** SQL に渡す値（プレースホルダ ? に入る値） */
export type SqlValue = string | number | null
/** DB から返ってくる 1 マスの値。BLOB は文字列に変換して返す */
export type SqlCell = string | number | null

export type StatementKind =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'create'
  | 'drop'
  | 'alter'
  | 'other'

/** あるテーブルのその時点の中身 */
export type TableSnapshot = {
  name: string
  columns: string[]
  rows: SqlCell[][]
  /** 各行の rowid（SQLite が行ごとに持つ内部番号）。WITHOUT ROWID テーブルなら null */
  rowids: number[] | null
  /** テーブル全体の行数（rows は先頭の一部だけのことがある） */
  total: number
}

/** 1 つの SQL でテーブルがどう変わったか */
export type TableChanges = {
  inserted: number[]
  updated: { rowid: number; cols: string[]; before: SqlCell[] }[]
  deleted: { rowid: number; row: SqlCell[] }[]
}

/** DB で SQL を 1 文実行した記録 */
export type ExecResult = {
  sql: string
  params: SqlValue[]
  kind: StatementKind
  ok: boolean
  error?: string
  columns: string[]
  rows: SqlCell[][]
  truncated: boolean
  /** DB が読んだ行数 / 書いた行数（SQLite が数えた値） */
  rowsRead: number
  rowsWritten: number
  /** 実行後のテーブルの中身。初期化のように何文も流すときは最後の 1 文にだけ付ける */
  tables?: TableSnapshot[]
  changes: Record<string, TableChanges>
  /** WHERE などで選ばれた行の rowid（SELECT なら結果の順番どおり） */
  matched: Record<string, number[]>
  createdTables: string[]
  droppedTables: string[]
}

/** 学習用に API のレスポンスへ添える「裏側の記録」（Django Debug Toolbar のようなもの） */
export type ApiDebug = {
  /** Django で書いた場合の urls.py / views.py */
  view: string
  queries: ExecResult[]
}

export type ApiBody<T> = {
  data?: T
  error?: string
  hint?: string
  debug?: ApiDebug
}

export type Task = {
  id: number
  title: string
  done: boolean
  priority: number
  category_id: number | null
}

export type Category = { id: number; name: string }

export type SqlRunData = {
  columns: string[]
  rows: SqlCell[][]
  truncated: boolean
  rowsRead: number
  rowsWritten: number
}

export type SchemaEntry = { name: string; sql: string }

/** 画面から API へ送ったリクエスト 1 回分の記録 */
export type RequestRecord = {
  id: string
  method: string
  url: string
  body?: unknown
  status: number
  response: ApiBody<unknown>
  /** main = その操作の主役。followup = 続けて一覧を取り直す、などの脇役 */
  role: 'main' | 'followup'
}

/** 画面での操作 1 回分（中に 1 つ以上のリクエストを持つ） */
export type Action = {
  id: string
  label: string
  source: 'app' | 'sql' | 'schema' | 'system'
  at: number
  requests: RequestRecord[]
  /** 画面がどう変わったか */
  outcome?: string
}
