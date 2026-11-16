export type Choice = { kanji: string; meaning: string }

export type Glyph = {
  reading: string
  kanji: string
  meaning: string
}

export type Seal = {
  name: string
  reading: string
  glyphs: Glyph[]
}

export type SealResult = { ok: true; seal: Seal } | { ok: false; reason: 'empty' | 'no-letters' }

const FALLBACK: readonly Choice[] = [
  { kanji: '明', meaning: 'bright' },
  { kanji: '和', meaning: 'harmony' },
  { kanji: '幸', meaning: 'happiness' },
]

const CHOICES: Record<string, readonly Choice[]> = {
  ア: [{ kanji: '愛', meaning: 'love' }, { kanji: '明', meaning: 'bright' }, { kanji: '安', meaning: 'peace' }],
  イ: [{ kanji: '生', meaning: 'life' }, { kanji: '彩', meaning: 'color' }, { kanji: '勇', meaning: 'courage' }],
  ウ: [{ kanji: '羽', meaning: 'wings' }, { kanji: '宇', meaning: 'the wide sky' }, { kanji: '唄', meaning: 'song' }],
  エ: [{ kanji: '恵', meaning: 'blessing' }, { kanji: '笑', meaning: 'smile' }, { kanji: '枝', meaning: 'a living branch' }],
  オ: [{ kanji: '桜', meaning: 'cherry blossom' }, { kanji: '央', meaning: 'center' }, { kanji: '恩', meaning: 'grace' }],
  カ: [{ kanji: '花', meaning: 'flower' }, { kanji: '佳', meaning: 'excellent' }, { kanji: '歌', meaning: 'song' }],
  キ: [{ kanji: '希', meaning: 'hope' }, { kanji: '輝', meaning: 'radiance' }, { kanji: '樹', meaning: 'tree' }],
  ク: [{ kanji: '空', meaning: 'sky' }, { kanji: '久', meaning: 'lasting' }, { kanji: '来', meaning: 'welcome arrival' }],
  ケ: [{ kanji: '慶', meaning: 'joy' }, { kanji: '結', meaning: 'a bond' }, { kanji: '景', meaning: 'a fine view' }],
  コ: [{ kanji: '幸', meaning: 'happiness' }, { kanji: '心', meaning: 'heart' }, { kanji: '湖', meaning: 'lake' }],
  ガ: [{ kanji: '雅', meaning: 'elegance' }, { kanji: '賀', meaning: 'celebration' }, { kanji: '芽', meaning: 'a new sprout' }],
  ギ: [{ kanji: '義', meaning: 'what is right' }, { kanji: '技', meaning: 'skill' }, { kanji: '宜', meaning: 'a good fit' }],
  グ: [{ kanji: '宮', meaning: 'a bright hall' }, { kanji: '楽', meaning: 'ease' }, { kanji: '求', meaning: 'a worthy search' }],
  ゲ: [{ kanji: '芸', meaning: 'art' }, { kanji: '迎', meaning: 'welcome' }, { kanji: '慶', meaning: 'joy' }],
  ゴ: [{ kanji: '悟', meaning: 'insight' }, { kanji: '護', meaning: 'protection' }, { kanji: '語', meaning: 'words' }],
  サ: [{ kanji: '咲', meaning: 'to bloom' }, { kanji: '幸', meaning: 'happiness' }, { kanji: '沙', meaning: 'fine sand' }],
  シ: [{ kanji: '詩', meaning: 'poem' }, { kanji: '志', meaning: 'will' }, { kanji: '紫', meaning: 'violet' }],
  ス: [{ kanji: '澄', meaning: 'clear' }, { kanji: '寿', meaning: 'long life' }, { kanji: '涼', meaning: 'cool and fresh' }],
  セ: [{ kanji: '星', meaning: 'star' }, { kanji: '世', meaning: 'the world' }, { kanji: '清', meaning: 'pure' }],
  ソ: [{ kanji: '素', meaning: 'simple and pure' }, { kanji: '想', meaning: 'a kind thought' }, { kanji: '空', meaning: 'sky' }],
  ザ: [{ kanji: '座', meaning: 'a place to sit' }, { kanji: '彩', meaning: 'color' }, { kanji: '咲', meaning: 'to bloom' }],
  ジ: [{ kanji: '慈', meaning: 'compassion' }, { kanji: '時', meaning: 'time' }, { kanji: '治', meaning: 'peace' }],
  ズ: [{ kanji: '瑞', meaning: 'auspicious' }, { kanji: '津', meaning: 'a safe harbor' }, { kanji: '寿', meaning: 'long life' }],
  ゼ: [{ kanji: '善', meaning: 'goodness' }, { kanji: '是', meaning: 'what is right' }, { kanji: '星', meaning: 'star' }],
  ゾ: [{ kanji: '造', meaning: 'to create' }, { kanji: '増', meaning: 'increase' }, { kanji: '象', meaning: 'a noble shape' }],
  タ: [{ kanji: '太', meaning: 'great' }, { kanji: '爽', meaning: 'refreshing' }, { kanji: '多', meaning: 'plenty' }],
  チ: [{ kanji: '知', meaning: 'wisdom' }, { kanji: '千', meaning: 'a thousand' }, { kanji: '地', meaning: 'the good earth' }],
  ツ: [{ kanji: '津', meaning: 'a safe harbor' }, { kanji: '都', meaning: 'capital' }, { kanji: '通', meaning: 'an open path' }],
  テ: [{ kanji: '天', meaning: 'sky' }, { kanji: '照', meaning: 'to shine' }, { kanji: '手', meaning: 'a helping hand' }],
  ト: [{ kanji: '灯', meaning: 'lamp' }, { kanji: '翔', meaning: 'to soar' }, { kanji: '斗', meaning: 'the north star' }],
  ダ: [{ kanji: '暖', meaning: 'warmth' }, { kanji: '大', meaning: 'great' }, { kanji: '妥', meaning: 'gentle' }],
  デ: [{ kanji: '陽', meaning: 'sunlight' }, { kanji: '出', meaning: 'setting out' }, { kanji: '伝', meaning: 'what is handed on' }],
  ド: [{ kanji: '道', meaning: 'the path' }, { kanji: '努', meaning: 'effort' }, { kanji: '土', meaning: 'earth' }],
  ナ: [{ kanji: '菜', meaning: 'greens' }, { kanji: '和', meaning: 'harmony' }, { kanji: '奈', meaning: 'Nara, a soft name' }],
  ニ: [{ kanji: '虹', meaning: 'rainbow' }, { kanji: '仁', meaning: 'kindness' }, { kanji: '新', meaning: 'new' }],
  ヌ: [{ kanji: '温', meaning: 'warmth' }, { kanji: '縫', meaning: 'mending' }, { kanji: '布', meaning: 'cloth' }],
  ネ: [{ kanji: '願', meaning: 'a wish' }, { kanji: '根', meaning: 'roots' }, { kanji: '音', meaning: 'a clear sound' }],
  ノ: [{ kanji: '望', meaning: 'hope' }, { kanji: '野', meaning: 'an open field' }, { kanji: '乃', meaning: 'belonging' }],
  ハ: [{ kanji: '晴', meaning: 'clear weather' }, { kanji: '羽', meaning: 'wings' }, { kanji: '波', meaning: 'a gentle wave' }],
  ヒ: [{ kanji: '陽', meaning: 'sunlight' }, { kanji: '光', meaning: 'light' }, { kanji: '日', meaning: 'the sun' }],
  フ: [{ kanji: '風', meaning: 'wind' }, { kanji: '富', meaning: 'abundance' }, { kanji: '芙', meaning: 'lotus' }],
  ヘ: [{ kanji: '平', meaning: 'peace' }, { kanji: '星', meaning: 'star' }, { kanji: '辺', meaning: 'horizon' }],
  ホ: [{ kanji: '穂', meaning: 'grain in the ear' }, { kanji: '帆', meaning: 'a sail' }, { kanji: '歩', meaning: 'a step forward' }],
  バ: [{ kanji: '葉', meaning: 'a green leaf' }, { kanji: '芭', meaning: 'a broad leaf' }, { kanji: '春', meaning: 'spring' }],
  ビ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '陽', meaning: 'sunlight' }, { kanji: '光', meaning: 'light' }],
  ブ: [{ kanji: '舞', meaning: 'dance' }, { kanji: '豊', meaning: 'plenty' }, { kanji: '武', meaning: 'valor' }],
  ベ: [{ kanji: '紅', meaning: 'crimson' }, { kanji: '明', meaning: 'bright' }, { kanji: '辺', meaning: 'horizon' }],
  ボ: [{ kanji: '望', meaning: 'hope' }, { kanji: '慕', meaning: 'affection' }, { kanji: '歩', meaning: 'a step forward' }],
  パ: [{ kanji: '晴', meaning: 'clear weather' }, { kanji: '波', meaning: 'a gentle wave' }, { kanji: '羽', meaning: 'wings' }],
  ピ: [{ kanji: '光', meaning: 'light' }, { kanji: '美', meaning: 'beauty' }, { kanji: '陽', meaning: 'sunlight' }],
  プ: [{ kanji: '普', meaning: 'wide and shared' }, { kanji: '風', meaning: 'wind' }, { kanji: '芙', meaning: 'lotus' }],
  ペ: [{ kanji: '平', meaning: 'peace' }, { kanji: '星', meaning: 'star' }, { kanji: '明', meaning: 'bright' }],
  ポ: [{ kanji: '歩', meaning: 'a step forward' }, { kanji: '帆', meaning: 'a sail' }, { kanji: '穂', meaning: 'grain in the ear' }],
  マ: [{ kanji: '真', meaning: 'truth' }, { kanji: '舞', meaning: 'dance' }, { kanji: '茉', meaning: 'jasmine' }],
  ミ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '実', meaning: 'fruit' }, { kanji: '海', meaning: 'the sea' }],
  ム: [{ kanji: '夢', meaning: 'a dream' }, { kanji: '睦', meaning: 'harmony' }, { kanji: '向', meaning: 'facing the light' }],
  メ: [{ kanji: '恵', meaning: 'blessing' }, { kanji: '芽', meaning: 'a new sprout' }, { kanji: '愛', meaning: 'love' }],
  モ: [{ kanji: '茂', meaning: 'flourishing' }, { kanji: '望', meaning: 'hope' }, { kanji: '百', meaning: 'a hundred good things' }],
  ヤ: [{ kanji: '弥', meaning: 'more and more' }, { kanji: '優', meaning: 'gentle' }, { kanji: '野', meaning: 'an open field' }],
  ユ: [{ kanji: '友', meaning: 'friend' }, { kanji: '勇', meaning: 'courage' }, { kanji: '悠', meaning: 'ease' }],
  ヨ: [{ kanji: '良', meaning: 'good' }, { kanji: '誉', meaning: 'honor' }, { kanji: '世', meaning: 'the world' }],
  ラ: [{ kanji: '楽', meaning: 'joy' }, { kanji: '蘭', meaning: 'orchid' }, { kanji: '羅', meaning: 'fine silk' }],
  リ: [{ kanji: '里', meaning: 'home village' }, { kanji: '理', meaning: 'reason' }, { kanji: '梨', meaning: 'pear blossom' }],
  ル: [{ kanji: '流', meaning: 'a clear stream' }, { kanji: '瑠', meaning: 'lapis' }, { kanji: '留', meaning: 'to stay' }],
  レ: [{ kanji: '礼', meaning: 'courtesy' }, { kanji: '麗', meaning: 'beauty' }, { kanji: '鈴', meaning: 'a small bell' }],
  ロ: [{ kanji: '朗', meaning: 'bright and open' }, { kanji: '路', meaning: 'the road' }, { kanji: '露', meaning: 'dew' }],
  ワ: [{ kanji: '和', meaning: 'harmony' }, { kanji: '輪', meaning: 'a circle of friends' }, { kanji: '笑', meaning: 'smile' }],
  ン: [{ kanji: '運', meaning: 'good fortune' }, { kanji: '雲', meaning: 'cloud' }, { kanji: '音', meaning: 'a clear sound' }],
  ウィ: [{ kanji: '意', meaning: 'meaning' }, { kanji: '威', meaning: 'quiet dignity' }, { kanji: '慰', meaning: 'comfort' }],
  ウェ: [{ kanji: '恵', meaning: 'blessing' }, { kanji: '絵', meaning: 'a picture' }, { kanji: '栄', meaning: 'glory' }],
  ウォ: [{ kanji: '桜', meaning: 'cherry blossom' }, { kanji: '央', meaning: 'center' }, { kanji: '恩', meaning: 'grace' }],
  ファ: [{ kanji: '花', meaning: 'flower' }, { kanji: '風', meaning: 'wind' }, { kanji: '羽', meaning: 'wings' }],
  フィ: [{ kanji: '光', meaning: 'light' }, { kanji: '美', meaning: 'beauty' }, { kanji: '陽', meaning: 'sunlight' }],
  フェ: [{ kanji: '星', meaning: 'star' }, { kanji: '平', meaning: 'peace' }, { kanji: '恵', meaning: 'blessing' }],
  フォ: [{ kanji: '帆', meaning: 'a sail' }, { kanji: '豊', meaning: 'plenty' }, { kanji: '穂', meaning: 'grain in the ear' }],
  ティ: [{ kanji: '天', meaning: 'sky' }, { kanji: '光', meaning: 'light' }, { kanji: '知', meaning: 'wisdom' }],
  トゥ: [{ kanji: '都', meaning: 'capital' }, { kanji: '翔', meaning: 'to soar' }, { kanji: '灯', meaning: 'lamp' }],
  ディ: [{ kanji: '陽', meaning: 'sunlight' }, { kanji: '大', meaning: 'great' }, { kanji: '暖', meaning: 'warmth' }],
  ドゥ: [{ kanji: '道', meaning: 'the path' }, { kanji: '努', meaning: 'effort' }, { kanji: '土', meaning: 'earth' }],
  シャ: [{ kanji: '紗', meaning: 'fine silk' }, { kanji: '謝', meaning: 'gratitude' }, { kanji: '曙', meaning: 'dawn' }],
  シュ: [{ kanji: '秀', meaning: 'excellence' }, { kanji: '珠', meaning: 'a pearl' }, { kanji: '守', meaning: 'to protect' }],
  シェ: [{ kanji: '星', meaning: 'star' }, { kanji: '清', meaning: 'pure' }, { kanji: '世', meaning: 'the world' }],
  ショ: [{ kanji: '翔', meaning: 'to soar' }, { kanji: '書', meaning: 'writing' }, { kanji: '照', meaning: 'to shine' }],
  ジャ: [{ kanji: '慈', meaning: 'compassion' }, { kanji: '寿', meaning: 'long life' }, { kanji: '彩', meaning: 'color' }],
  ジュ: [{ kanji: '樹', meaning: 'tree' }, { kanji: '寿', meaning: 'long life' }, { kanji: '純', meaning: 'pure' }],
  ジェ: [{ kanji: '恵', meaning: 'blessing' }, { kanji: '光', meaning: 'light' }, { kanji: '慈', meaning: 'compassion' }],
  ジョ: [{ kanji: '城', meaning: 'a castle' }, { kanji: '丈', meaning: 'steadiness' }, { kanji: '情', meaning: 'warm feeling' }],
  チャ: [{ kanji: '茶', meaning: 'tea, a welcome' }, { kanji: '千', meaning: 'a thousand' }, { kanji: '彩', meaning: 'color' }],
  チュ: [{ kanji: '中', meaning: 'the heart of things' }, { kanji: '忠', meaning: 'loyalty' }, { kanji: '宙', meaning: 'the cosmos' }],
  チェ: [{ kanji: '智', meaning: 'wisdom' }, { kanji: '千', meaning: 'a thousand' }, { kanji: '悦', meaning: 'delight' }],
  チョ: [{ kanji: '朝', meaning: 'morning' }, { kanji: '長', meaning: 'lasting' }, { kanji: '兆', meaning: 'a good sign' }],
  ニャ: [{ kanji: '雅', meaning: 'elegance' }, { kanji: '和', meaning: 'harmony' }, { kanji: '菜', meaning: 'greens' }],
  ニュ: [{ kanji: '新', meaning: 'new' }, { kanji: '柔', meaning: 'gentle' }, { kanji: '乳', meaning: 'milk, nourishment' }],
  ニョ: [{ kanji: '女', meaning: 'woman' }, { kanji: '如', meaning: 'grace' }, { kanji: '暖', meaning: 'warmth' }],
  キャ: [{ kanji: '花', meaning: 'flower' }, { kanji: '希', meaning: 'hope' }, { kanji: '輝', meaning: 'radiance' }],
  キュ: [{ kanji: '久', meaning: 'lasting' }, { kanji: '空', meaning: 'sky' }, { kanji: '来', meaning: 'welcome arrival' }],
  キョ: [{ kanji: '京', meaning: 'capital' }, { kanji: '鏡', meaning: 'a clear mirror' }, { kanji: '響', meaning: 'echo' }],
  ギャ: [{ kanji: '雅', meaning: 'elegance' }, { kanji: '芽', meaning: 'a new sprout' }, { kanji: '賀', meaning: 'celebration' }],
  ギュ: [{ kanji: '宮', meaning: 'a bright hall' }, { kanji: '久', meaning: 'lasting' }, { kanji: '求', meaning: 'a worthy search' }],
  ギョ: [{ kanji: '漁', meaning: 'a good catch' }, { kanji: '暁', meaning: 'dawn' }, { kanji: '業', meaning: 'good work' }],
  リャ: [{ kanji: '良', meaning: 'good' }, { kanji: '涼', meaning: 'cool and fresh' }, { kanji: '蘭', meaning: 'orchid' }],
  リュ: [{ kanji: '流', meaning: 'a clear stream' }, { kanji: '龍', meaning: 'dragon' }, { kanji: '隆', meaning: 'rising' }],
  リョ: [{ kanji: '涼', meaning: 'cool and fresh' }, { kanji: '旅', meaning: 'a journey' }, { kanji: '亮', meaning: 'clear and bright' }],
  ミャ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '雅', meaning: 'elegance' }, { kanji: '真', meaning: 'truth' }],
  ミュ: [{ kanji: '夢', meaning: 'a dream' }, { kanji: '美', meaning: 'beauty' }, { kanji: '実', meaning: 'fruit' }],
  ミョ: [{ kanji: '明', meaning: 'bright' }, { kanji: '妙', meaning: 'wonder' }, { kanji: '命', meaning: 'life' }],
  ヒャ: [{ kanji: '陽', meaning: 'sunlight' }, { kanji: '光', meaning: 'light' }, { kanji: '百', meaning: 'a hundred good things' }],
  ヒュ: [{ kanji: '日', meaning: 'the sun' }, { kanji: '飛', meaning: 'flight' }, { kanji: '光', meaning: 'light' }],
  ヒョ: [{ kanji: '表', meaning: 'what shows' }, { kanji: '氷', meaning: 'clear ice' }, { kanji: '豹', meaning: 'a leopard, courage' }],
  ビャ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '白', meaning: 'white, a clean start' }, { kanji: '陽', meaning: 'sunlight' }],
  ビュ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '舞', meaning: 'dance' }, { kanji: '豊', meaning: 'plenty' }],
  ビョ: [{ kanji: '妙', meaning: 'wonder' }, { kanji: '明', meaning: 'bright' }, { kanji: '美', meaning: 'beauty' }],
  ピャ: [{ kanji: '光', meaning: 'light' }, { kanji: '平', meaning: 'peace' }, { kanji: '美', meaning: 'beauty' }],
  ピュ: [{ kanji: '純', meaning: 'pure' }, { kanji: '光', meaning: 'light' }, { kanji: '美', meaning: 'beauty' }],
  ピョ: [{ kanji: '漂', meaning: 'afloat' }, { kanji: '平', meaning: 'peace' }, { kanji: '表', meaning: 'what shows' }],
  イェ: [{ kanji: '恵', meaning: 'blessing' }, { kanji: '家', meaning: 'home' }, { kanji: '笑', meaning: 'smile' }],
  ツァ: [{ kanji: '彩', meaning: 'color' }, { kanji: '幸', meaning: 'happiness' }, { kanji: '咲', meaning: 'to bloom' }],
  ツィ: [{ kanji: '慈', meaning: 'compassion' }, { kanji: '知', meaning: 'wisdom' }, { kanji: '路', meaning: 'the road' }],
  ツェ: [{ kanji: '星', meaning: 'star' }, { kanji: '清', meaning: 'pure' }, { kanji: '世', meaning: 'the world' }],
  ツォ: [{ kanji: '造', meaning: 'to create' }, { kanji: '想', meaning: 'a kind thought' }, { kanji: '空', meaning: 'sky' }],
  キェ: [{ kanji: '景', meaning: 'a fine view' }, { kanji: '慶', meaning: 'joy' }, { kanji: '恵', meaning: 'blessing' }],
  ギェ: [{ kanji: '芸', meaning: 'art' }, { kanji: '迎', meaning: 'welcome' }, { kanji: '慶', meaning: 'joy' }],
  ニェ: [{ kanji: '音', meaning: 'a clear sound' }, { kanji: '新', meaning: 'new' }, { kanji: '仁', meaning: 'kindness' }],
  ヒェ: [{ kanji: '光', meaning: 'light' }, { kanji: '平', meaning: 'peace' }, { kanji: '日', meaning: 'the sun' }],
  ビェ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '笑', meaning: 'smile' }, { kanji: '光', meaning: 'light' }],
  ピェ: [{ kanji: '平', meaning: 'peace' }, { kanji: '光', meaning: 'light' }, { kanji: '星', meaning: 'star' }],
  ミェ: [{ kanji: '美', meaning: 'beauty' }, { kanji: '芽', meaning: 'a new sprout' }, { kanji: '恵', meaning: 'blessing' }],
  リェ: [{ kanji: '礼', meaning: 'courtesy' }, { kanji: '麗', meaning: 'beauty' }, { kanji: '鈴', meaning: 'a small bell' }],
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const ROW: Record<string, Record<string, string>> = {
  k: { a: 'カ', i: 'キ', u: 'ク', e: 'ケ', o: 'コ' },
  g: { a: 'ガ', i: 'ギ', u: 'グ', e: 'ゲ', o: 'ゴ' },
  s: { a: 'サ', i: 'シ', u: 'ス', e: 'セ', o: 'ソ' },
  z: { a: 'ザ', i: 'ジ', u: 'ズ', e: 'ゼ', o: 'ゾ' },
  t: { a: 'タ', i: 'ティ', u: 'トゥ', e: 'テ', o: 'ト' },
  d: { a: 'ダ', i: 'ディ', u: 'ドゥ', e: 'デ', o: 'ド' },
  n: { a: 'ナ', i: 'ニ', u: 'ヌ', e: 'ネ', o: 'ノ' },
  h: { a: 'ハ', i: 'ヒ', u: 'フ', e: 'ヘ', o: 'ホ' },
  b: { a: 'バ', i: 'ビ', u: 'ブ', e: 'ベ', o: 'ボ' },
  p: { a: 'パ', i: 'ピ', u: 'プ', e: 'ペ', o: 'ポ' },
  m: { a: 'マ', i: 'ミ', u: 'ム', e: 'メ', o: 'モ' },
  r: { a: 'ラ', i: 'リ', u: 'ル', e: 'レ', o: 'ロ' },
  f: { a: 'ファ', i: 'フィ', u: 'フ', e: 'フェ', o: 'フォ' },
  j: { a: 'ジャ', i: 'ジ', u: 'ジュ', e: 'ジェ', o: 'ジョ' },
  w: { a: 'ワ', i: 'ウィ', u: 'ウ', e: 'ウェ', o: 'ウォ' },
  y: { a: 'ヤ', i: 'イ', u: 'ユ', e: 'イェ', o: 'ヨ' },
}

const YOON: Record<string, Record<string, string>> = {
  k: { a: 'キャ', u: 'キュ', o: 'キョ', e: 'キェ' },
  g: { a: 'ギャ', u: 'ギュ', o: 'ギョ', e: 'ギェ' },
  n: { a: 'ニャ', u: 'ニュ', o: 'ニョ', e: 'ニェ' },
  h: { a: 'ヒャ', u: 'ヒュ', o: 'ヒョ', e: 'ヒェ' },
  b: { a: 'ビャ', u: 'ビュ', o: 'ビョ', e: 'ビェ' },
  p: { a: 'ピャ', u: 'ピュ', o: 'ピョ', e: 'ピェ' },
  m: { a: 'ミャ', u: 'ミュ', o: 'ミョ', e: 'ミェ' },
  r: { a: 'リャ', u: 'リュ', o: 'リョ', e: 'リェ' },
}

const DIGRAPH: Record<string, Record<string, string>> = {
  sh: { a: 'シャ', i: 'シ', u: 'シュ', e: 'シェ', o: 'ショ' },
  ch: { a: 'チャ', i: 'チ', u: 'チュ', e: 'チェ', o: 'チョ' },
  ts: { a: 'ツァ', i: 'ツィ', u: 'ツ', e: 'ツェ', o: 'ツォ' },
  qu: { a: 'クワ', i: 'クイ', u: 'ク', e: 'クエ', o: 'クォ' },
}

const LONE: Record<string, string> = {
  k: 'ク', g: 'グ', s: 'ス', z: 'ズ', t: 'ト', d: 'ド', n: 'ン', h: '',
  b: 'ブ', p: 'プ', m: 'ム', r: 'ル', f: 'フ', j: 'ジ', w: 'ウ', y: 'イ',
  sh: 'シュ', ch: 'チ', ts: 'ツ', qu: 'ク',
}

type Vowel = 'a' | 'i' | 'u' | 'e' | 'o'

function normalizeWords(raw: string): string[] {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/['’]/g, '')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)
}

function hashName(name: string): number {
  let hash = 2166136261
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function isVowel(char: string | undefined): char is Vowel {
  return char !== undefined && VOWELS.has(char)
}

function takeVowel(word: string, index: number): { vowel: Vowel; long: boolean; next: number } | null {
  const char = word[index]
  if (!isVowel(char)) return null
  if (word[index + 1] === char) {
    const vowel: Vowel = char === 'e' ? 'i' : char === 'o' ? 'u' : char
    return { vowel, long: true, next: index + 2 }
  }
  return { vowel: char, long: false, next: index + 1 }
}

function pushKana(tokens: string[], kana: string, long: boolean) {
  if (!kana) return
  tokens.push(kana)
  if (long) tokens.push('ー')
}

function parseWord(word: string): string[] {
  const tokens: string[] = []
  let index = 0
  while (index < word.length) {
    const char = word[index] ?? ''
    const next = word[index + 1]
    if (char === next && !VOWELS.has(char) && char !== 'n') {
      tokens.push('ッ')
      index += 1
      continue
    }
    if (char === 'n' && next === 'n') {
      const after = word[index + 2]
      if (isVowel(after) || (after === 'y' && isVowel(word[index + 3]))) {
        tokens.push('ッ')
        index += 1
        continue
      }
      tokens.push('ン')
      index += 2
      continue
    }
    if (char === 'n' && !(isVowel(next) || next === 'y')) {
      tokens.push('ン')
      index += 1
      continue
    }
    const vowel = takeVowel(word, index)
    if (vowel) {
      pushKana(tokens, vowelKana(vowel.vowel), vowel.long)
      index = vowel.next
      continue
    }
    if (char === 'h' && index === word.length - 1) {
      index += 1
      continue
    }
    index = readConsonant(word, index, tokens)
  }
  return fold(tokens)
}

function vowelKana(vowel: Vowel): string {
  const map: Record<Vowel, string> = { a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ' }
  return map[vowel]
}

function readConsonant(word: string, start: number, tokens: string[]): number {
  const three = word.slice(start, start + 2)
  let row = ''
  let digraph = ''
  let index = start
  if (three === 'sh' || three === 'ch' || three === 'ts' || three === 'qu') {
    digraph = three
    index += 2
  } else if (three === 'th') {
    row = 't'
    index += 2
  } else if (three === 'ph') {
    row = 'f'
    index += 2
  } else if (three === 'wh') {
    row = 'w'
    index += 2
  } else if (three === 'ck') {
    row = 'k'
    index += 2
  } else {
    const letter = word[start] ?? ''
    index += 1
    if (letter === 'l') row = 'r'
    else if (letter === 'v') row = 'b'
    else if (letter === 'c') {
      const ahead = word[index]
      row = ahead === 'e' || ahead === 'i' || ahead === 'y' ? 's' : 'k'
    } else if (letter === 'q') row = 'k'
    else if (letter === 'x') row = 'x'
    else row = letter
  }

  if (row === 'x') {
    const vowel = takeVowel(word, index)
    if (vowel) {
      pushKana(tokens, ROW.z?.[vowel.vowel] ?? 'ズ', vowel.long)
      return vowel.next
    }
    tokens.push('クス')
    return index
  }

  if (digraph === 'qu') {
    const vowel = takeVowel(word, index)
    if (vowel) {
      pushKana(tokens, DIGRAPH.qu?.[vowel.vowel] ?? 'ク', vowel.long)
      return vowel.next
    }
    tokens.push('ク')
    return index
  }

  if (digraph && (word[index] === 'y' && isVowel(word[index + 1]))) {
    const vowel = takeVowel(word, index + 1)
    if (vowel) {
      pushKana(tokens, DIGRAPH[digraph]?.[vowel.vowel] ?? LONE[digraph] ?? '', vowel.long)
      return vowel.next
    }
  }

  if (row && YOON[row] && word[index] === 'y' && isVowel(word[index + 1])) {
    const vowel = takeVowel(word, index + 1)
    if (vowel) {
      const yoon = YOON[row]?.[vowel.vowel]
      pushKana(tokens, yoon ?? ROW[row]?.[vowel.vowel] ?? '', vowel.long)
      return vowel.next
    }
  }

  const vowel = takeVowel(word, index)
  if (vowel) {
    const table = digraph ? DIGRAPH[digraph] : ROW[row]
    pushKana(tokens, table?.[vowel.vowel] ?? LONE[digraph || row] ?? '', vowel.long)
    return vowel.next
  }

  if (word[index] === 'y') {
    const table = digraph ? DIGRAPH[digraph] : ROW[row]
    pushKana(tokens, table?.i ?? 'イ', false)
    return index + 1
  }

  const lone = digraph ? LONE[digraph] : LONE[row]
  if (lone) tokens.push(lone)
  return index
}

function fold(tokens: string[]): string[] {
  const readings: string[] = []
  let pending = ''
  for (const token of tokens) {
    if (token === 'ッ') {
      pending += 'ッ'
      continue
    }
    if (token === 'ー') {
      if (readings.length > 0) readings[readings.length - 1] += 'ー'
      else if (pending) readings.push(pending)
      pending = ''
      continue
    }
    readings.push(pending + token)
    pending = ''
  }
  if (pending) readings.push(pending)
  return readings.filter((reading) => reading.replace(/[ッー]/g, '').length > 0)
}

export function isCurated(reading: string): boolean {
  const base = reading.replace(/[ッー]/g, '')
  return Object.prototype.hasOwnProperty.call(CHOICES, base)
}

function choicesFor(reading: string): readonly Choice[] {
  const base = reading.replace(/[ッー]/g, '')
  return CHOICES[base] ?? FALLBACK
}

export function sealFor(raw: string, shifts: readonly number[] = []): SealResult {
  const name = raw.trim()
  if (!name) return { ok: false, reason: 'empty' }
  const words = normalizeWords(name)
  if (words.length === 0) return { ok: false, reason: 'no-letters' }
  const groups = words.map(parseWord)
  const readings = groups.flat()
  if (readings.length === 0) return { ok: false, reason: 'no-letters' }
  const salt = hashName(words.join(' '))
  const glyphs = readings.map((reading, index) => {
    const list = choicesFor(reading)
    const base = (salt + index * 17) % list.length
    const shift = shifts[index] ?? 0
    const choice = list[(base + shift) % list.length] ?? list[0]
    return { reading, kanji: choice?.kanji ?? '明', meaning: choice?.meaning ?? 'bright' }
  })
  return {
    ok: true,
    seal: {
      name,
      reading: groups.map((group) => group.join('')).join(' '),
      glyphs,
    },
  }
}

export type SealMark = {
  cols: number
  rows: number
  fontSize: number
  chars: { char: string; x: number; y: number }[]
}

export function layoutSeal(chars: readonly string[], box = 320): SealMark {
  const count = Math.max(chars.length, 1)
  const cols = count <= 4 ? 1 : count <= 8 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const fontSize = rows <= 2 ? 72 : rows === 3 ? 52 : rows === 4 ? 42 : 32
  const margin = 56
  const inner = box - margin * 2
  const colWidth = inner / cols
  const rowHeight = inner / rows
  const placed = chars.map((char, index) => {
    const colFromRight = Math.floor(index / rows)
    const row = index % rows
    const col = cols - 1 - colFromRight
    return {
      char,
      x: margin + colWidth * col + colWidth / 2,
      y: margin + rowHeight * row + rowHeight / 2,
    }
  })
  return { cols, rows, fontSize, chars: placed }
}
