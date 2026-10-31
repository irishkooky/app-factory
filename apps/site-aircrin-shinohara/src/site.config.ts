/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真と★は、先方が Googleマップに載せているものを表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** メニューの種類。写真の振り分けにも使う */
export type MenuKey = 'aircon' | 'hood' | 'bath' | 'veranda'

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

// ---- エアクリン シノハラ（東京都西東京市富士町）への提案用 ----
// 文面の根拠（2026-10-31 確認）:
// - 住所・電話・受付時間・評価・写真: Googleマップ（Places API）。写真はすべて先方が載せたもの
// - 選ばれる理由・FAQ の対応内容: Googleマップのクチコミ（原文は載せず、こちらの言葉で要約）
// - 省エネ基準と東京ゼロエミポイント: nippon.com、東京ゼロエミポイント公式
// 料金表・人数・保険・代表者名など確かめられないことは書かない。自宅兼の可能性があるので住所は丁目までにする。

export const site: SiteConfig = {
  company: {
    name: 'エアクリン シノハラ',
    kana: 'えあくりん しのはら',
    tagline: '西東京市のエアコン分解クリーニング',
  },
  contact: {
    phone: '080-5386-0379',
    postalCode: '202-0014',
    address: '東京都西東京市富士町1丁目',
    hours: '毎日 9:00〜17:00',
    schedule: [[9, 17], [9, 17], [9, 17], [9, 17], [9, 17], [9, 17], [9, 17]],
    callTip: 'エアコンのメーカーと台数、お掃除機能が付いているかを教えていただくと話が早く進みます。',
  },
  google: {
    placeId: 'ChIJ406IiV7vGGAR5tAsVzM5vk4',
    rating: 5,
    count: 24,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E3%82%A8%E3%82%A2%E3%82%AF%E3%83%AA%E3%83%B3%20%E3%82%B7%E3%83%8E%E3%83%8F%E3%83%A9&query_place_id=ChIJ406IiV7vGGAR5tAsVzM5vk4',
    photoNotes: [
      { width: 4032, height: 3024, title: '浴槽のエプロンの中', menu: 'bath', pair: { id: 'apron', role: 'before' } },
      { width: 3024, height: 4032, title: '外した水受け（ドレンパン）のカビ', menu: 'aircon', hero: 2 },
      { width: 4032, height: 3024, title: '洗浄カバーを付けて、本体を洗う', menu: 'aircon', hero: 1 },
      { width: 4032, height: 3024, title: '養生して、フィンとファンを洗う準備', menu: 'aircon' },
      { width: 3024, height: 4032, title: '外した浴槽のエプロン', menu: 'bath', hide: true },
      { width: 3024, height: 4032, title: '本体を外した壁', menu: 'aircon', hide: true },
      { width: 3024, height: 4032, title: 'エプロンの裏についたカビ', menu: 'bath' },
      { width: 4032, height: 3024, title: '浴槽のエプロンの中', menu: 'bath', pair: { id: 'apron', role: 'after' }, detail: 'ふだん見えない浴槽の横まで、カビを落としました' },
      { width: 4032, height: 3024, title: '吹き出し口の奥のファン', menu: 'aircon' },
      { width: 3024, height: 4032, title: '作業を終えた壁掛けエアコン', menu: 'aircon', hero: 3 },
    ],
  },
  hero: {
    badge: { icon: 'camera', text: '洗う前と後を、毎回お見せします' },
    catchcopy: '「ここまでやるの？」\nというほど、洗う。',
    lead: '西東京市富士町のエアコン屋です。エアコンを奥まで分解して洗い、洗う前と後をお見せします。使い方やお手入れのこつまでお話しするので、次の夏も快適です。',
  },
  trust: [
    { icon: 'clock', label: '毎日受付', value: '9:00〜17:00' },
    { icon: 'wrench', label: 'エアコンの洗い方', value: '奥まで分解して洗う' },
    { icon: 'chat', label: 'ご予約のあと', value: '前日と当日にご連絡' },
  ],
  menu: {
    kicker: 'メニュー',
    title: 'どこを、\nきれいにしますか？',
    lead: '場所を選ぶと、よくあるお悩みと、エアクリン シノハラでできることが分かります。',
    items: [
      {
        key: 'aircon',
        label: 'エアコン',
        icon: 'aircon',
        symptoms: ['つけるとカビっぽいニオイがする', '前より風が弱い、音が大きい気がする', '吹き出し口の奥に黒い点々が見える'],
        work: 'パネルや水受け（ドレンパン）まで外して、熱交換器とファンを奥まで洗います。洗ったあと、風が強くなった、音が静かになったという声をいただいています。',
      },
      {
        key: 'hood',
        label: 'レンジフード',
        icon: 'fan',
        symptoms: ['油がこびりついて、自分では落とせない', '換気の吸い込みが弱くなった'],
        work: 'エアコンと同じように、外せる部品は外して洗います。エアコンのあとに続けてご依頼いただくことが多い場所です。',
      },
      {
        key: 'bath',
        label: '浴室',
        icon: 'shower',
        symptoms: ['浴槽の横のカバー（エプロン）の中が気になる', '鏡のウロコ、換気扇のほこり'],
        work: '換気扇から鏡、浴槽まで、お風呂場全体を洗います。外せる浴槽のエプロンは外して、ふだん見えない中まできれいにします。',
      },
      {
        key: 'veranda',
        label: 'ベランダ',
        icon: 'home',
        symptoms: ['砂ぼこりや黒ずみがたまっている', '排水口のまわりが汚れている'],
        work: 'ベランダの清掃もお受けしています。エアコンの室外機まわりと一緒にどうぞ。',
      },
    ],
    options: [],
  },
  reasons: [
    {
      label: '分解の深さ',
      icon: 'wrench',
      title: '「ここまでやる？」というほど、分解する。',
      body: 'ほかの業者からのり換えたお客さまが、別物だったと書いてくださいました。内部まで外して洗うので、洗ったあとは風が強くなり、音も静かになります。',
      evidence: ['別の業者から変えたら、分解の深さが別物だった', '洗ったあと、風量が増えて音が小さくなった', '内部まで解体して、すみずみまでピカピカにしてくれた'],
    },
    {
      label: '説明',
      icon: 'chat',
      title: '作業の前に説明し、使い方まで話す。',
      body: 'あいさつと作業の説明から始めます。終わったら、1年を通したエアコンの使い方や、ふだんのお手入れのしかたもお伝えします。',
      evidence: ['丁寧なあいさつと、作業内容の説明から始まった', '1年を通した使い方や、日々のお手入れまで教えてくれた', '一つひとつ説明しながら、2台をあっという間に洗ってくれた'],
    },
    {
      label: '連絡と養生',
      icon: 'calendar',
      title: '前日と当日に、必ずご連絡します。',
      body: 'ご予約の前日と当日に連絡を入れてから伺います。作業の場所だけでなく、通り道まで養生してから始めます。',
      evidence: ['毎回、前日と当日に丁寧な連絡がある', '通り道から作業の場所まで養生してくれた'],
    },
    {
      label: 'また頼む',
      icon: 'smile',
      title: 'エアコンのあとは、お風呂も、ベランダも。',
      body: '洗う前と後を毎回お見せします。エアコンをきっかけに、レンジフードや浴室、ベランダまで続けて頼んでくださるお客さまがいます。',
      evidence: ['毎回ビフォーアフターを見せてくれる', 'エアコン2回、ベランダ、浴室と4回お願いしている', 'エアコンに続いて、レンジフードもお願いした'],
    },
  ],
  guide: {
    kicker: 'エアコンの汚れ',
    title: 'そのニオイ、\nカビかもしれません。',
    lead: '冷房や除湿のあと、エアコンの中は湿ったままになりがちです。こんなサインが出たら、クリーニングを考える目安です。',
    checks: [
      { title: '運転を始めると、すっぱい・カビっぽいニオイがする', description: 'ニオイの元は、ファンや熱交換器についたカビやほこりのことが多いです。' },
      { title: '前より風が弱い、音が大きい', description: 'フィンやファンにほこりがたまると、風の通り道が狭くなります。' },
      { title: '吹き出し口をのぞくと、黒い点々が見える', description: '筒の形をしたファンについたカビです。フィルターの掃除だけでは届きません。' },
      { title: '前にクリーニングしてから、2年以上たっている', description: '毎日のように使うなら、1〜2年に1回がひとつの目安です。' },
    ],
    tip: {
      title: 'ご自分でできること',
      body: 'フィルターのほこりを2週間に1回ほど掃除機で吸うと、効きがよくなります。冷房のあとに送風運転を少しすると、中が乾いてカビが育ちにくくなります。',
    },
    side: {
      kicker: '買い替えを考えている方へ',
      title: '2027年4月から、エアコンの基準が変わります。',
      body: [
        '家庭用エアコンの省エネの基準が厳しくなり、安い機種が減って値上がりすると見込まれています。そのため2026年は買い替えが増えています。',
        '東京都は、省エネのエアコンに買い替えるとその場で値引きされる「東京ゼロエミポイント」を、2027年3月31日まで続けています（予算がなくなると早く終わることがあります）。',
      ],
      note: '買い替えるか、クリーニングして使い続けるか。迷ったら、今のエアコンの状態を見てからご相談ください。',
      links: [
        { label: '東京ゼロエミポイント（公式）', href: 'https://www.tz-points.jp/' },
        { label: 'エアコンの2027年問題（nippon.com）', href: 'https://www.nippon.com/ja/japan-data/h02851/' },
      ],
    },
  },
  flow: [
    { title: 'お電話・ご予約', description: 'メーカーと台数、お掃除機能の有無を教えてください。日程を決めます。' },
    { title: '前日・当日のご連絡', description: '伺う前日と当日に、時間をご連絡します。' },
    { title: '養生して分解・洗浄', description: '通り道まで養生してから、部品を外して奥まで洗います。' },
    { title: '洗う前と後をお見せする', description: '汚れの落ち方をお見せして、使い方とお手入れのこつをお伝えします。' },
  ],
  area: {
    city: '西東京市',
    home: '富士町',
    note: '西東京市の外も、まずはお電話でご相談ください。',
    summary: '西東京市とその周辺',
  },
  faq: [
    { q: 'エアコン1台だけでも来てもらえますか？', a: 'はい、1台から伺います。台数をお電話のときにお知らせください。' },
    { q: 'お掃除機能付きのエアコンも洗えますか？', a: 'メーカーと型番をお電話のときにお知らせください。機種を確かめてからご案内します。' },
    { q: 'エアコン以外も頼めますか？', a: 'はい。レンジフード、浴室、ベランダの清掃もお受けしています。エアコンと一緒のご依頼もどうぞ。' },
    { q: '部屋が汚れないか心配です。', a: '作業の場所だけでなく、通り道まで養生してから始めます。' },
    { q: '当日の時間はどうやって分かりますか？', a: '伺う前日と当日に、こちらからご連絡します。' },
    { q: '料金はいくらくらいですか？', a: '機種と台数、場所によって変わります。まずはお電話で、メーカーと台数をお知らせください。' },
  ],
  profile: [],
  work: 'エアコンの分解クリーニング、レンジフードのクリーニング、浴室のクリーニング（浴槽のエプロンの中まで）、ベランダの清掃',
  contactTitle: 'エアコンのニオイが気になったら、\nまずはお電話を。',
  site: {
    url: 'https://aircrin-shinohara.sonnet.co.jp',
    title: 'エアクリン シノハラ｜西東京市のエアコン分解クリーニング・レンジフード・浴室',
    description:
      '西東京市富士町のエアコン屋、エアクリン シノハラ。エアコンを奥まで分解して洗い、洗う前と後をお見せします。レンジフード・浴室・ベランダの清掃も。毎日9時〜17時受付。',
    schemaType: 'HomeAndConstructionBusiness',
    isProposal: true,
    proposedBy: '合同会社ソネット',
  },
}
