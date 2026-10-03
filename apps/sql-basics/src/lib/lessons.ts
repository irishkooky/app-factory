// 「SQL を書いてみる」タブのレッスン。上から順にやれば基礎の基本がひととおり触れる

export type Lesson = {
  no: number
  short: string
  title: string
  body: string
  sql: string
  django: string
  point: string
  /** 同じレッスンで試せる別の書き方 */
  more?: { label: string; sql: string }[]
}

export const LESSONS: Lesson[] = [
  {
    no: 1,
    short: 'SELECT',
    title: 'SELECT ─ テーブルの中身を見る',
    body: 'SELECT は「表からデータを取り出して見せて」という命令。* は「すべての列」という意味。まずは tasks テーブルを丸ごと見てみよう。',
    sql: 'SELECT * FROM tasks;',
    django: 'Task.objects.all()',
    point: 'SQL のキーワードは大文字でも小文字でも動く（select でも OK）。大文字で書くのは、どこがキーワードか見分けやすくするための習慣。',
    more: [{ label: 'categories も見る', sql: 'SELECT * FROM categories;' }],
  },
  {
    no: 2,
    short: '列を選ぶ',
    title: '列を選ぶ ─ 必要な項目だけ取り出す',
    body: '* の代わりに列の名前をカンマ区切りで書くと、その列だけを取り出せる。',
    sql: 'SELECT title, done FROM tasks;',
    django: 'Task.objects.values("title", "done")',
    point: '「DB の中」の表は全部の列が見えるけど、結果（レスポンス）に入るのは指定した列だけ。必要な列だけにすると通信量も減る。',
  },
  {
    no: 3,
    short: 'WHERE',
    title: 'WHERE ─ 条件に合う行だけに絞る',
    body: 'WHERE のあとに条件を書くと、当てはまる行だけが残る。done は 0 が未完了、1 が完了。',
    sql: 'SELECT * FROM tasks WHERE done = 0;',
    django: 'Task.objects.filter(done=False)',
    point: 'SQLite には true / false 専用の型がないので 0 と 1 で表す。Django の BooleanField も SQLite では 0 / 1 で保存されている。',
    more: [
      { label: '優先度 2 以上', sql: 'SELECT * FROM tasks WHERE priority >= 2;' },
      { label: '「買う」を含む', sql: "SELECT * FROM tasks WHERE title LIKE '%買う%';" },
      { label: 'AND でかけ合わせ', sql: 'SELECT * FROM tasks WHERE done = 0 AND priority = 3;' },
      { label: 'id で 1 件', sql: 'SELECT * FROM tasks WHERE id = 3;' },
    ],
  },
  {
    no: 4,
    short: 'ORDER BY',
    title: 'ORDER BY ─ 並べる',
    body: 'ORDER BY で並び順を決める。DESC は大きい順（降順）、ASC か何も書かなければ小さい順（昇順）。',
    sql: 'SELECT * FROM tasks ORDER BY priority DESC;',
    django: 'Task.objects.order_by("-priority")',
    point: 'ORDER BY を書かないと、順番は保証されない。いつも同じ順で出てくるように見えても、それはたまたま。',
    more: [{ label: 'タイトル順', sql: 'SELECT * FROM tasks ORDER BY title;' }],
  },
  {
    no: 5,
    short: 'LIMIT',
    title: 'LIMIT ─ 件数をしぼる',
    body: 'LIMIT で「最大何行まで」を決める。ORDER BY と組み合わせると「新しい 3 件」のような取り出し方ができる。',
    sql: 'SELECT * FROM tasks ORDER BY id DESC LIMIT 3;',
    django: 'Task.objects.order_by("-id")[:3]',
    point: 'Django のスライス [:3] は SQL の LIMIT 3 に変換される。一覧ページのページ送りもこの仕組み。',
  },
  {
    no: 6,
    short: 'INSERT',
    title: 'INSERT ─ 行を追加する',
    body: 'INSERT INTO で新しい行を足す。（列の名前）と VALUES（値）は同じ順番で対応する。書かなかった列には自動の番号や初期値（DEFAULT）が入る。',
    sql: "INSERT INTO tasks (title, priority, category_id) VALUES ('SQLを練習する', 3, 3);",
    django: 'Task.objects.create(title="SQLを練習する", priority=3, category_id=3)',
    point: 'id を書かなくても次の番号が自動で入る（INTEGER PRIMARY KEY の働き）。文字は \'...\' のようにシングルクォートで囲む。',
  },
  {
    no: 7,
    short: 'UPDATE',
    title: 'UPDATE ─ 行を書き換える',
    body: 'UPDATE で既にある行を書き換える。SET に「どの列をどう変えるか」、WHERE に「どの行を」を書く。',
    sql: 'UPDATE tasks SET done = 1 WHERE id = 1;',
    django: 'Task.objects.filter(id=1).update(done=True)',
    point: 'WHERE を忘れると全部の行が書き換わる。実務でいちばん怖いミスの一つ。ここはあなた専用の DB なので、試しても「初期状態に戻す」で元どおりにできる。',
    more: [{ label: 'WHERE を忘れると…', sql: 'UPDATE tasks SET done = 1;' }],
  },
  {
    no: 8,
    short: 'DELETE',
    title: 'DELETE ─ 行を消す',
    body: 'DELETE FROM で行を消す。どの行が消えるかは WHERE で決まる。',
    sql: 'DELETE FROM tasks WHERE done = 1;',
    django: 'Task.objects.filter(done=True).delete()',
    point: 'DELETE FROM tasks; だけだと全部消える。消したデータは普通は戻らない（このラボでは初期状態に戻せる）。',
  },
  {
    no: 9,
    short: 'COUNT / GROUP BY',
    title: 'COUNT と GROUP BY ─ 数える・まとめる',
    body: 'COUNT(*) は行の数を数える。GROUP BY をつけると、同じ値の行どうしをまとめて、グループごとに数えられる。',
    sql: 'SELECT done, COUNT(*) AS count FROM tasks GROUP BY done;',
    django: 'Task.objects.values("done").annotate(count=Count("id"))',
    point: 'まずは SELECT COUNT(*) FROM tasks; で全体の件数を数えてみよう。Django の .count() はこの SQL になる。',
    more: [
      { label: '全体の件数', sql: 'SELECT COUNT(*) FROM tasks;' },
      { label: 'カテゴリごと', sql: 'SELECT category_id, COUNT(*) AS count FROM tasks GROUP BY category_id;' },
    ],
  },
  {
    no: 10,
    short: 'JOIN',
    title: 'JOIN ─ 2 つのテーブルをつなぐ',
    body: 'tasks にはカテゴリの番号（category_id）しか入っていない。JOIN で categories テーブルを横につなげると、番号の代わりにカテゴリ名を出せる。ON には「どの列とどの列が対応するか」を書く。',
    sql: 'SELECT tasks.title, categories.name FROM tasks JOIN categories ON tasks.category_id = categories.id;',
    django: 'Task.objects.select_related("category")  # task.category.name で名前が取れる',
    point: '表を分けて番号でつなぐのが「リレーショナル（関係）データベース」の基本の考え方。カテゴリ名を変えたいときも categories の 1 行を直すだけで済む。',
    more: [
      {
        label: 'カテゴリ名ごとの件数',
        sql: 'SELECT categories.name, COUNT(*) AS count FROM tasks JOIN categories ON tasks.category_id = categories.id GROUP BY categories.name;',
      },
    ],
  },
]
