export type Category = 'tool' | 'game' | 'demo'

export type AppMeta = {
  title: string
  description: string
  category: Category
  tags: string[]
  /** 一覧に出さない（雛形・ポータル自身など） */
  hidden?: boolean
}

export const CATEGORY_LABELS: Record<Category, string> = {
  tool: 'ツール',
  game: 'ゲーム',
  demo: 'デモ',
}

/** カテゴリタブの表示順 */
export const CATEGORY_ORDER: Category[] = ['tool', 'game', 'demo']

export const META: Record<string, AppMeta> = {
  lab: {
    title: 'app-factory LAB',
    description: 'このページ自身。',
    category: 'demo',
    tags: [],
    hidden: true,
  },
  hello: {
    title: 'app-factory 雛形',
    description: '新規アプリを作るときにコピーするテンプレート。',
    category: 'demo',
    tags: ['テンプレート'],
    hidden: true,
  },
  'ai-era-skill-quiz': {
    title: 'AI時代にはもう要らない？エンジニアスキルクイズ',
    description: 'AIに聞けば済むようになった懐かしのスキルを4択で出題。高得点ほど化石度が高い。',
    category: 'game',
    tags: ['クイズ', 'AI', '診断'],
  },
  'akachan-party': {
    title: '赤ちゃんパーティー',
    description: 'スマホ1台で遊べる飲み会ゲーム。お題も占いも、いちばん小さい人が決める。',
    category: 'game',
    tags: ['パーティー', '飲み会'],
  },
  'auth-demo': {
    title: '認証デモ（Clerk × Convex）',
    description: 'Googleログイン付きメモアプリ。認証アプリを作るときの参照実装。',
    category: 'demo',
    tags: ['認証', 'Clerk', 'Convex'],
  },
  'cash-forecast': {
    title: '残高予測',
    description: '基準残高と毎月の入出金予定から、12ヶ月先までの残高推移を可視化する。',
    category: 'tool',
    tags: ['家計', '予測', 'Convex'],
  },
  'convex-showcase': {
    title: 'Convex Showcase',
    description: 'リアルタイム同期とリレーショナル問い合わせを、実際に触って体感するデモ。',
    category: 'demo',
    tags: ['Convex', 'リアルタイム', 'DB'],
  },
  guestbook: {
    title: 'ゲストブック',
    description: 'ひとことメッセージを投稿して並べるだけの、シンプルな公開掲示板。',
    category: 'tool',
    tags: ['掲示板', 'Convex'],
  },
  'loop-engineering-demo': {
    title: 'ループエンジニアリング入門',
    description: 'AIエージェントの「行動→観察→判定」ループの設計を解説する教材ページ。',
    category: 'demo',
    tags: ['AI', 'エージェント', '教材'],
  },
  'loxonin-reminder': {
    title: 'ロキソニンリマインダー',
    description: '服用時刻を記録して次に飲めるタイミングを通知する。PWAでホーム画面に置ける。',
    category: 'tool',
    tags: ['服薬管理', 'PWA', 'Convex'],
  },
  'pitch-battle': {
    title: '酔いどれピッチバトル',
    description: '無茶振りのお題で60秒ピッチ。部屋コードで集まって戦うリアルタイム飲み会ゲーム。',
    category: 'game',
    tags: ['パーティー', 'リアルタイム', 'Convex'],
  },
  'pitch-roulette': {
    title: 'ピッチルーレット',
    description: 'ルーレットで決まったお題で即興ピッチし、仲間から架空の出資を集める。',
    category: 'game',
    tags: ['パーティー', 'リアルタイム', 'Convex'],
  },
  'salon-booking': {
    title: 'SALON LUMIÈRE',
    description: '架空の美容室の予約サイト。メニュー・スタイリスト紹介から予約まで通せる。',
    category: 'tool',
    tags: ['予約', 'サイト', 'Convex'],
  },
  'token-cost-checker': {
    title: 'Token Cost Checker',
    description: 'Claude各モデルのトークン単価から、API利用料を日本円で試算する電卓。',
    category: 'tool',
    tags: ['Claude', 'API', '料金'],
  },
  'token-cost-checker-b': {
    title: 'Token Cost Checker B',
    description: '同じ料金電卓を別の実装方針で作ったB版。作り方の比較用。',
    category: 'demo',
    tags: ['Claude', '料金', '比較検証'],
  },
  'token-cost-checker-fable-only': {
    title: 'Token Cost Checker（Fable単独）',
    description: 'Fableだけで実装した料金電卓。単独モデルでどこまで作れるかの検証。',
    category: 'demo',
    tags: ['Claude', '料金', '比較検証'],
  },
  'token-cost-checker-fable-orchestration': {
    title: 'Token Cost Checker（Fableオーケストレーション）',
    description: 'Fableが他モデルに委任する構成で実装した料金電卓。分担効果の検証。',
    category: 'demo',
    tags: ['Claude', '料金', '比較検証'],
  },
  'token-cost-checker-sonnet-only': {
    title: 'Token Cost Checker（Sonnet単独）',
    description: 'Sonnetだけで実装した料金電卓。単独モデルでどこまで作れるかの検証。',
    category: 'demo',
    tags: ['Claude', '料金', '比較検証'],
  },
  'tokyo-outfit': {
    title: 'Tokyo Outfit',
    description: '東京の今日の気温と手持ちのクローゼットから、着ていく服を提案する。',
    category: 'tool',
    tags: ['天気', '服装', '東京'],
  },
  'turing-werewolf': {
    title: 'チューリング人狼',
    description: '参加者＋1席にAIが紛れ込むチャットゲーム。会話から「どの席がAIか」を当てる。',
    category: 'game',
    tags: ['AI', 'リアルタイム', 'Convex'],
  },
}
