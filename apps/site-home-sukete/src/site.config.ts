/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真と★は、先方が Googleマップに載せているものを表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** メニューの種類。写真の振り分けにも使う */
export type MenuKey = 'glass' | 'key' | 'furniture' | 'home'

/**
 * Googleマップの写真に付ける説明。API が返す並び順（0始まり）で書く。
 * 元画像の幅×高さが合わないときは説明を付けない（先方が写真を足すと並びが変わるため）。
 */
export type PhotoNote = {
  width: number
  height: number
  title: string
  menu?: MenuKey
  /** 写真に書き込まれている金額 */
  price?: string
  /** 施工前後を並べるときの組（同じ pair の before と after を並べる） */
  pair?: { id: string; role: 'before' | 'after' }
  /** 施工前後の組の下に添える一言（after の写真に書く） */
  detail?: string
  /** ヒーローに出す順（小さいほど手前） */
  hero?: number
  /** 一覧に出さない（ヒーローだけで使う、似た写真が続く など） */
  hide?: boolean
}

export type SiteConfig = {
  company: {
    name: string
    kana: string
    /** ヘッダーのロゴの下に出す短い説明 */
    tagline: string
  }
  contact: {
    phone: string
    postalCode: string
    /** 表示する住所（自宅兼の店は丁目まで） */
    address: string
    /** 受付時間の表示用。公開されていなければ空文字（表示しない） */
    hours: string
    /** 曜日ごとの受付時間（日曜を0とする7要素、時の数値、休みは null）。「ただいま受付中」を日本時間で出す。分からなければ [] */
    schedule: ([number, number] | null)[]
    /** 電話の前に知っておくと話が早いこと */
    callTip: string
  }
  google: {
    placeId: string
    /** API が使えないときに出す値（2026-10-31 時点） */
    rating: number
    count: number
    mapsUrl: string
    photoNotes: PhotoNote[]
  }
  hero: {
    badge: { icon: IconName; text: string }
    catchcopy: string
    lead: string
  }
  /** ヒーロー直下の「確かめられる事実」。★は自動で先頭に入る */
  trust: { icon: IconName; label: string; value: string; href?: string; source?: string }[]
  menu: {
    kicker: string
    title: string
    lead: string
    items: { key: MenuKey; label: string; icon: IconName; symptoms: string[]; work: string }[]
    /** 追加で頼めること */
    options: string[]
  }
  /** 料金の実例。出どころを必ず書く。確かめられる金額が無ければ書かない（区切りごと出ない） */
  prices?: {
    title: string
    lead: string
    items: { title: string; price: string; note: string }[]
    source: string
    href: string
  }
  /** 選ばれる理由。evidence はクチコミの要約（原文は載せない） */
  reasons: { label: string; title: string; body: string; evidence: string[]; icon: IconName }[]
  guide: {
    kicker: string
    title: string
    lead: string
    checks: { title: string; description: string }[]
    tip: { title: string; body: string }
    side: { kicker: string; title: string; body: string[]; note: string; links: { label: string; href: string }[] }
  }
  flow: { title: string; description: string }[]
  /** rings: 地図の点線の距離（km、近い順に2つ）。省くと 2km・4km */
  area: { city: string; home: string; note: string; summary: string; rings?: [number, number] }
  faq: { q: string; a: string }[]
  /** 会社案内の表に足す行 */
  profile: { label: string; value: string }[]
  work: string
  contactTitle: string
  site: {
    url: string
    title: string
    description: string
    /** schema.org の種類 */
    schemaType: string
    /** 先回りで作った提案用サンプルなら true（noindex と提案帯） */
    isProposal: boolean
    proposedBy: string
  }
}

// ---- 超便利屋！ホーム助っ人（埼玉県越谷市袋山）への提案用 ----
// 文面の根拠（2026-10-31 確認）:
// - 住所・電話・受付時間・評価・写真: Googleマップ（Places API）。写真はすべて先方が載せたもの
// - 坂戸市・吉川市での作業: 先方の写真に書き込まれた地名
// - 選ばれる理由・FAQ の対応内容: Googleマップのクチコミ（原文は載せず、こちらの言葉で要約）
// - 熱割れのしくみ: 日本板硝子「ガラスワンダーランド」
// 料金表・代表者名・創業年・LINE の URL など確かめられないことは書かない。住所は集合住宅なので町名までにする。

export const site: SiteConfig = {
  company: {
    name: '超便利屋！ホーム助っ人',
    kana: 'ちょうべんりや ほーむすけっと',
    tagline: '越谷市の便利屋・窓ガラス・鍵',
  },
  contact: {
    phone: '048-911-2135',
    postalCode: '343-0032',
    address: '埼玉県越谷市袋山',
    hours: '毎日 9:00〜20:00',
    schedule: [[9, 20], [9, 20], [9, 20], [9, 20], [9, 20], [9, 20], [9, 20]],
    callTip: '困っていることと、場所（窓・ドア・家具など）を教えていただくと、料金の目安をお伝えできます。LINEでのご相談も受けています。',
  },
  google: {
    placeId: 'ChIJ97hRXxG9GGARRZ3tny1Jfuo',
    rating: 5,
    count: 55,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E8%B6%85%E4%BE%BF%E5%88%A9%E5%B1%8B%EF%BC%81%E3%83%9B%E3%83%BC%E3%83%A0%E5%8A%A9%E3%81%A3%E4%BA%BA&query_place_id=ChIJ97hRXxG9GGARRZ3tny1Jfuo',
    photoNotes: [
      { width: 1080, height: 1080, title: 'バイクの鍵をつくる（坂戸市）', menu: 'key', hero: 3 },
      { width: 1110, height: 1474, title: '玄関の鍵の作業', menu: 'key', hero: 2 },
      { width: 4080, height: 3072, title: '窓ガラスを入れ替える', menu: 'glass', hero: 1 },
      { width: 500, height: 500, title: 'ガラスを切る道具', menu: 'glass' },
      { width: 1080, height: 1080, title: '石で割れた窓ガラスの交換（越谷市）', menu: 'glass' },
      { width: 4080, height: 3072, title: '割れた窓ガラス', menu: 'glass', pair: { id: 'window', role: 'before' } },
      { width: 4080, height: 3072, title: '割れた窓ガラス', menu: 'glass', pair: { id: 'window', role: 'after' }, detail: '割れたガラスを外して、新しいガラスに入れ替えました' },
      { width: 4080, height: 3072, title: '家具を運ぶ', menu: 'furniture' },
      { width: 500, height: 500, title: '窓ガラスの交換（吉川市）', menu: 'glass' },
      { width: 1108, height: 1477, title: '屋根の修理', menu: 'home' },
    ],
  },
  hero: {
    badge: { icon: 'chat', text: 'LINEでも、ご相談を受けています' },
    catchcopy: '家の困りごとを、\nまるごと助っ人。',
    lead: '越谷市袋山の便利屋です。割れた窓ガラスの交換、鍵の交換、家具の組み立てや移動、ドアの交換まで。お電話かLINEで内容を伺って、先に料金をお伝えします。',
  },
  trust: [
    { icon: 'clock', label: '毎日受付', value: '9:00〜20:00' },
    { icon: 'chat', label: 'ご相談', value: 'お電話・LINE' },
    { icon: 'yen', label: '料金', value: '作業の前にお伝えします' },
  ],
  menu: {
    kicker: 'メニュー',
    title: 'どんなことで、\n困っていますか？',
    lead: '困りごとを選ぶと、よくあるお悩みと、ホーム助っ人でできることが分かります。',
    items: [
      {
        key: 'glass',
        label: '窓ガラス',
        icon: 'home',
        symptoms: ['窓ガラスが割れた、ヒビが入った', '何もぶつけていないのに、ヒビが入っていた', '何年も気になっているガラスがある'],
        work: '割れたガラスを外して、新しいガラスに入れ替えます。石が当たって割れた窓を、30分ほどで入れ替えたこともあります。',
      },
      {
        key: 'key',
        label: '鍵',
        icon: 'key',
        symptoms: ['引っ越したので、玄関の鍵を替えたい', '鍵をなくした、合鍵がほしい'],
        work: '玄関の鍵の交換をします。バイクの鍵をつくったこともあります。お電話で、先に料金をお伝えします。',
      },
      {
        key: 'furniture',
        label: '家具・運ぶ',
        icon: 'box',
        symptoms: ['買った家具を、自分で組み立てられない', '重い物を、別の部屋や階に移したい'],
        work: 'キッチンボードなどの組み立てや、電子ピアノの移動（同じマンションの2階から3階）をお受けしたことがあります。',
      },
      {
        key: 'home',
        label: '家のこと',
        icon: 'wrench',
        symptoms: ['室内のドアを替えたい', '蛇口のノズルを付け替えたい', '屋根や家のあちこちが気になる'],
        work: '室内ドアの交換、キッチンの蛇口のノズルの取り付け、屋根の修理など、家の困りごとを広くお受けしています。',
      },
    ],
    options: [],
  },
  reasons: [
    {
      label: '先に料金',
      icon: 'yen',
      title: '料金は、作業の前に。',
      body: 'LINEやお電話でご相談いただいた段階で、料金をお伝えします。良心的な値段だった、という声をいただいています。',
      evidence: ['LINEで相談したときに、料金も出してくれた', '電話で鍵交換の見積もりを頼んだら、明確な料金を出してくれた', '良心的な値段だった'],
    },
    {
      label: 'まず相談',
      icon: 'chat',
      title: '「こんなこと頼めるかな」から。',
      body: 'どこに頼めばいいか分からないことも、まずはご相談ください。鍵の交換をきっかけに、次はピアノの移動、と続けて頼まれることがあります。',
      evidence: ['鍵の交換と蛇口のノズルの取り付けに続いて、電子ピアノの移動も頼んだ', 'マッチングサービスで探すより、ここに頼んでよかった', '窓ガラスを直したうえに、ほかの困りごとにも対応してくれた'],
    },
    {
      label: '段取り',
      icon: 'calendar',
      title: '時間どおりに来て、手早く終える。',
      body: '必要なら下見に伺い、LINEで段取りを決めてから作業します。時間どおりに伺って、予定より早く終わることもあります。',
      evidence: ['事前の下見と、その後のLINEのやりとりの感じがよかった', '時間どおりに来て、予定より早く終わった', '1時間ちょっとで、きれいに組み立ててくれた'],
    },
    {
      label: '人柄',
      icon: 'smile',
      title: '困ったら、まず思い出してもらえる人。',
      body: '同じマンションで仕事ぶりを見た方から、その場でご依頼をいただいたこともあります。話しやすい、と言っていただいています。',
      evidence: ['代表の人柄がよく、話しやすかった', '困ったことがあったら、まず最初に相談したいと思える', '同じマンションで仕事ぶりを見て、その場でお願いした'],
    },
  ],
  guide: {
    kicker: '窓ガラスのヒビ',
    title: 'ぶつけていないのに、\nヒビが入ったら。',
    lead: '窓ガラスは、日差しの熱だけで割れることがあります。「熱割れ」と呼ばれるものです。こんなヒビは、熱割れかもしれません。',
    checks: [
      { title: '何もぶつけていないのに、ヒビが入っていた', description: '日差しで温まったガラスは、ふくらもうとします。それがきっかけで割れることがあります。' },
      { title: 'ヒビが、ガラスの端（サッシのきわ）から始まっている', description: '日が当たる真ん中は温まり、サッシに隠れた端は冷たいまま。その温度の差で、端に力がかかって割れます。' },
      { title: '日がよく当たる窓、カーテンを閉めきった窓', description: '窓の向き、ガラスの種類、日陰のでき方、カーテンなどで、起きやすさが変わります。' },
    ],
    tip: {
      title: '割れたら、まずはテープで留めて',
      body: '破片が落ちないよう、テープで留めて、触らないようにしてください。そのうえで、早めにご相談ください。',
    },
    side: {
      kicker: '何を頼めるか迷ったら',
      title: 'これまでに、こんなことを頼まれました。',
      body: [
        '室内ドアの交換、キッチンボードの組み立て、玄関の鍵の交換、バイクの鍵づくり、キッチンの蛇口のノズルの取り付け、電子ピアノの移動、窓ガラスの交換、屋根の修理。',
        'Googleマップのクチコミと写真にある、実際のご依頼です。',
      ],
      note: 'どこに頼めばいいか分からないことも、まずはお電話かLINEでご相談ください。',
      links: [{ label: '熱割れのしくみ（日本板硝子）', href: 'https://glass-wonderland.jp/architectural/simulation/about_break/' }],
    },
  },
  flow: [
    { title: 'お電話・LINEでご相談', description: '困っていることと場所を教えてください。' },
    { title: '料金をお伝えする', description: '内容を伺って、料金をお伝えします。必要なら下見に伺います。' },
    { title: '伺って作業', description: '決めた時間に伺い、手早く作業します。' },
    { title: '仕上がりの確認', description: '仕上がりを一緒に確かめていただきます。' },
  ],
  area: {
    city: '越谷市',
    home: '袋山',
    note: '坂戸市や吉川市でも作業をしています。越谷市の外も、まずはご相談ください。',
    summary: '越谷市とその周辺',
  },
  faq: [
    { q: 'こんなことでも頼めますか？', a: 'まずはご相談ください。窓ガラス、鍵、家具の組み立て、ピアノの移動、室内ドアの交換など、いろいろな困りごとをお受けしています。' },
    { q: '料金は先に分かりますか？', a: 'はい。お電話かLINEで内容を伺って、作業の前に料金をお伝えします。' },
    { q: 'LINEで相談できますか？', a: 'はい、LINEでのご相談も受けています。LINEで料金をお伝えしたこともあります。' },
    { q: '下見に来てもらえますか？', a: '内容によって伺います。室内ドアの交換では、先に下見に伺いました。' },
    { q: '越谷市の外でも来てもらえますか？', a: '坂戸市や吉川市でも作業をしています。まずはお電話でご相談ください。' },
  ],
  profile: [{ label: 'ご相談', value: 'お電話・LINE' }],
  work: '窓ガラスの交換、鍵の交換・鍵の作成、家具の組み立て、重い物の移動、室内ドアの交換、蛇口まわりの取り付け、屋根の修理など、住まいの困りごと',
  contactTitle: '家のことで困ったら、\nまずはお電話を。',
  site: {
    url: 'https://home-sukete.sonnet.co.jp',
    title: '超便利屋！ホーム助っ人｜越谷市の便利屋・窓ガラス交換・鍵交換・家具の組み立て',
    description:
      '越谷市袋山の便利屋、超便利屋！ホーム助っ人。割れた窓ガラスの交換、鍵の交換、家具の組み立てや移動、室内ドアの交換まで。お電話かLINEでご相談いただければ、先に料金をお伝えします。毎日9時〜20時受付。',
    schemaType: 'HomeAndConstructionBusiness',
    isProposal: true,
    proposedBy: '合同会社ソネット',
  },
}
