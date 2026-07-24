export type Question = {
  id: number
  category: string
  question: string
  choices: [string, string, string, string]
  answerIndex: 0 | 1 | 2 | 3
  explanation: string
}

export const questions: Question[] = [
  {
    id: 1,
    category: '正規表現',
    question: '正規表現 `^\\d{3}-\\d{4}$` にマッチする文字列はどれ？',
    choices: ['abc-defg', '123-4567', '12-34567', '1234567'],
    answerIndex: 1,
    explanation:
      '`\\d{3}` は数字3桁、`-` を挟んで `\\d{4}` は数字4桁。郵便番号の形式ですね。かつては正規表現を空で書けるのが腕の見せ所でしたが、今はAIに「郵便番号の正規表現書いて」で一瞬です。',
  },
  {
    id: 2,
    category: 'vim',
    question: 'vim で保存せずに強制終了するコマンドは？',
    choices: [':wq', ':q!', ':x', 'ZZ'],
    answerIndex: 1,
    explanation:
      '`:q!` が保存せず強制終了。「vim から抜けられない」は一時代を築いた世界的ミームでしたが、AIエディタ世代には通じなくなりつつあります。',
  },
  {
    id: 3,
    category: 'HTTP',
    question: 'HTTPステータスコード 418 の意味は？',
    choices: ['Too Many Requests', "I'm a teapot", 'Unavailable For Legal Reasons', 'Bad Gateway'],
    answerIndex: 1,
    explanation:
      '418 I\'m a teapot はエイプリルフールRFC由来のジョークコード。ステータスコード暗記はかつての教養でしたが、今は聞けば済みます。',
  },
  {
    id: 4,
    category: 'Git',
    question: '直前のコミットメッセージを修正するコマンドは？',
    choices: ['git rebase -i', 'git commit --amend', 'git reset --soft HEAD^', 'git cherry-pick'],
    answerIndex: 1,
    explanation:
      '`git commit --amend` で直前のコミットを修正できます。git コマンドの細かいオプション暗記も、AIに日本語で頼む時代になりました。',
  },
  {
    id: 5,
    category: 'CSS',
    question: 'Flexbox 以前、要素の上下左右中央揃えの定番テクニックは？',
    choices: [
      'margin: auto のみ',
      'position: absolute + transform: translate(-50%, -50%)',
      'float: center',
      'vertical-align: middle のみ',
    ],
    answerIndex: 1,
    explanation:
      'absolute 配置で50%移動してから自身の半分だけ戻す、あの呪文です。「CSSで中央揃え」は10年間エンジニアを苦しめた末、Flexbox と AI に完全敗北しました。',
  },
  {
    id: 6,
    category: 'シェル',
    question: 'カレントディレクトリ以下から拡張子 .log のファイルを探すコマンドは？',
    choices: ['grep -r *.log .', 'find . -name "*.log"', 'ls -R | *.log', 'locate ./*.log'],
    answerIndex: 1,
    explanation:
      '`find . -name "*.log"` が定番。find のオプション体系は覚えにくさで有名で、今や「ログファイル探して」で済むようになりました。',
  },
  {
    id: 7,
    category: 'SQL',
    question: 'SELECT で重複行を除いて取得するキーワードは？',
    choices: ['UNIQUE', 'DISTINCT', 'EXCEPT', 'GROUP'],
    answerIndex: 1,
    explanation:
      '`SELECT DISTINCT` です。SQL方言の暗記もAIの得意分野。ただし実行計画を読む力はまだ人間の出番があるかも。',
  },
  {
    id: 8,
    category: 'C言語',
    question: 'malloc で確保したメモリを解放する関数は？',
    choices: ['delete', 'free', 'release', 'dispose'],
    answerIndex: 1,
    explanation:
      '`free()` です。手動メモリ管理はGC言語とRustとAIレビューの登場でほぼ過去の技能になりましたが、組み込みの世界ではまだ現役です。',
  },
  {
    id: 9,
    category: '文字コード',
    question: '日本語版 Windows で伝統的に使われてきた文字コードは？',
    choices: ['UTF-8', 'Shift_JIS', 'EUC-JP', 'ISO-2022-JP'],
    answerIndex: 1,
    explanation:
      'Shift_JIS（CP932）です。「文字化けの直し方」はかつて日本のエンジニア必修科目でした。今はUTF-8に統一され、化けたらAIに貼れば解読してくれます。',
  },
  {
    id: 10,
    category: 'ネットワーク',
    question: 'ドメイン名から IPv4 アドレスを引く DNS レコードは？',
    choices: ['MX', 'A', 'CNAME', 'TXT'],
    answerIndex: 1,
    explanation:
      'A レコードです。dig コマンドの読み方を覚えるのも通過儀礼でしたが、今はエラーメッセージごとAIに投げる時代です。',
  },
  {
    id: 11,
    category: 'レガシーWeb',
    question: 'CSSハック `* html セレクタ` が効いていたブラウザは？',
    choices: ['IE6', 'Firefox 2', 'Safari 3', 'Opera 9'],
    answerIndex: 0,
    explanation:
      'IE6 専用のスターハックです。IEハック職人という専門技能が存在しましたが、IEの退場とともに完全に失われました。AIすらもう学ぶ必要のない知識です。',
  },
  {
    id: 12,
    category: '2進数・16進数',
    question: '16進数の FF を10進数にすると？',
    choices: ['127', '255', '256', '512'],
    answerIndex: 1,
    explanation:
      'FF = 15×16 + 15 = 255。カラーコード #FFFFFF でおなじみ。進数変換の暗算はプログラマの嗜みでしたが、電卓とAIに完全移管されました。',
  },
  {
    id: 13,
    category: 'ターミナル',
    question: 'man コマンドで開いたマニュアルを閉じるキーは？',
    choices: ['Esc', 'q', 'Ctrl+C', 'Ctrl+D'],
    answerIndex: 1,
    explanation:
      '`q` で閉じます（中身は less）。man を読み解く力はかつての自己解決能力の象徴でしたが、今は「このコマンドの使い方教えて」で済みます。',
  },
  {
    id: 14,
    category: 'Java',
    question: 'Java で Optional 登場以前、NullPointerException 対策の定番は？',
    choices: ['try-catch で握りつぶす', '利用前の null チェック地獄', '全部 String にする', 'synchronized を付ける'],
    answerIndex: 1,
    explanation:
      '`if (obj != null)` の多重ネスト、通称 null チェック地獄です。null安全な言語とAIレビューの普及で、この防衛術も過去のものになりつつあります。',
  },
  {
    id: 15,
    category: 'タイピング',
    question: 'タッチタイピングのホームポジションで、左手人差し指が置かれるキーは？',
    choices: ['D', 'F', 'G', 'J'],
    answerIndex: 1,
    explanation:
      'F キーです（突起があるアレ）。タイピング速度はエンジニアの生産性指標でしたが、音声入力とAIコーディングで「速く打つ」価値は下がる一方です。',
  },
  {
    id: 16,
    category: 'FTP',
    question: 'FTP の制御コネクションが使うポート番号は？',
    choices: ['20', '21', '22', '23'],
    answerIndex: 1,
    explanation:
      '21番です（データは20番）。FTPでのサイト更新は牧歌的時代の風物詩。ポート番号の暗記もAIに聞けば済む知識の代表格です。',
  },
]
