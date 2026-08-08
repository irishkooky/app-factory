// お題・フォールバック回答・仮名の定数定義。DBには入れない。

import { shuffle } from "./lib";

export type PromptDef = { text: string; fallbacks: string[] };

// PROMPTS[0] = 難易度1（易・人間有利）
// PROMPTS[1] = 難易度2（中）
// PROMPTS[2] = 難易度3（難・AI有利）
export const PROMPTS: PromptDef[][] = [
  [
    {
      text: "今日ここに来る途中で見たものを1つ",
      fallbacks: [
        "自転車に乗ってる人かな、特に意味はないけど",
        "コンビニの看板が目に入った",
        "特に何も、ぼーっと歩いてただけ",
      ],
    },
    {
      text: "昨日の夜ごはんはなんだった？",
      fallbacks: [
        "カレー。二日目のやつ",
        "パスタ、ありあわせで適当に作った",
        "コンビニのお弁当で済ませた",
      ],
    },
    {
      text: "いまカバンに入ってる一番いらないもの",
      fallbacks: [
        "レシートが溜まってる気がする",
        "使ってない充電ケーブル",
        "何かのポイントカード、たぶん期限切れ",
      ],
    },
  ],
  [
    {
      text: "直近1週間で一番イラッとしたこと",
      fallbacks: [
        "満員電車で足踏まれたこと",
        "会議が予定よりだいぶ長引いたこと",
        "アプリの通知が多すぎること",
      ],
    },
    {
      text: "最後に声に出して笑ったのはいつ、なんで？",
      fallbacks: [
        "昨日、動画見てて",
        "友達の話が面白すぎて",
        "ちょっと思い出せないけど最近笑った気はする",
      ],
    },
  ],
  [
    {
      text: "好きなプログラミング言語と、その理由",
      fallbacks: [
        "Python、なんとなく書きやすいから",
        "TypeScript、型があると安心する",
        "特にこだわりはなくて、その時使うやつ",
      ],
    },
    {
      text: "AIに仕事を任せていて一番ムカつく瞬間",
      fallbacks: [
        "聞いてないこと勝手に変えてくるとき",
        "同じミスを繰り返すとき",
        "自信満々で間違えてるとき",
      ],
    },
  ],
];

/** 難易度 = min(roundIndex, 2) からランダムに1つ選ぶ */
export function pickPrompt(roundIndex: number): PromptDef {
  const difficulty = Math.min(roundIndex, PROMPTS.length - 1);
  const pool = PROMPTS[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** promptText からフォールバック候補を逆引きする。見つからなければ汎用フォールバック */
export function getFallbacksForPrompt(promptText: string): string[] {
  for (const pool of PROMPTS) {
    const found = pool.find((p) => p.text === promptText);
    if (found) {
      return found.fallbacks;
    }
  }
  return ["うーん、ちょっと迷い中です", "それ、あとで考えます"];
}

// 「色/形容 + 動物」のひらがな仮名。部屋内で未使用のものをランダムに割り当てる。
export const ALIASES: string[] = [
  "あかいきつね",
  "みどりのたぬき",
  "しろいふくろう",
  "あおいねこ",
  "きいろいとかげ",
  "くろいうさぎ",
  "はいいろのふくろう",
  "ちゃいろいくま",
  "むらさきのさる",
  "あかいかめ",
  "あおいからす",
  "しろいひつじ",
  "くろいねこ",
  "きいろいひよこ",
  "みどりのかえる",
  "ちゃいろいいぬ",
  "はいいろのねずみ",
  "あかいぶた",
  "あおいさかな",
  "しろいうま",
  "くろいからす",
  "きいろいとり",
  "みどりのかめ",
  "むらさきのふくろう",
];

/** usedAliases に無いものからランダムに1つ選ぶ。全部使い切っていたら連番で衝突を避ける */
export function pickAlias(usedAliases: string[]): string {
  const used = new Set(usedAliases);
  const available = ALIASES.filter((alias) => !used.has(alias));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `${ALIASES[Math.floor(Math.random() * ALIASES.length)]}${used.size + 1}`;
}

/**
 * 重複なしで count 個の仮名をランダムに選ぶ（startGame で全席分を一括で振り直すために使う）。
 * プールを使い切ったら連番を付けて衝突を避ける。
 */
export function pickAliases(count: number): string[] {
  const shuffled = shuffle(ALIASES);
  const result = shuffled.slice(0, count);
  let extraIndex = 0;
  while (result.length < count) {
    const base = ALIASES[extraIndex % ALIASES.length];
    const suffix = Math.floor(extraIndex / ALIASES.length) + 2;
    result.push(`${base}${suffix}`);
    extraIndex++;
  }
  return result;
}
