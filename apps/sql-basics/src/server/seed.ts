// DB の初期状態。Django でいう migrate（CREATE TABLE）と loaddata（INSERT）にあたる

export const SEED_STATEMENTS: string[] = [
  `CREATE TABLE categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL
)`,
  `CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  priority    INTEGER NOT NULL DEFAULT 2,
  category_id INTEGER REFERENCES categories (id)
)`,
  `INSERT INTO categories (name) VALUES ('買い物'), ('仕事'), ('勉強')`,
  `INSERT INTO tasks (title, done, priority, category_id) VALUES
  ('牛乳を買う', 0, 2, 1),
  ('企画書を書く', 0, 3, 2),
  ('SQLの本を読む', 1, 2, 3),
  ('卵を買う', 1, 1, 1),
  ('会議の資料を印刷する', 0, 1, 2),
  ('Djangoのチュートリアルをやる', 0, 3, 3)`,
]
