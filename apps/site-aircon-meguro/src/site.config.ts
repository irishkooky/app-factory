/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真と★は、先方が Googleマップに載せているものを表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** メニューの種類。写真の振り分けにも使う */
export type MenuKey = 'wall' | 'auto' | 'ceiling' | 'leak' | 'bath'

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

// ---- エアコンメンテナンス目黒（東京都目黒区柿の木坂）への提案用 ----
// 文面の根拠（2026-10-31 確認）:
// - 住所・電話・受付時間・評価・写真: Googleマップ（Places API）
// - 対応機種・オプション・従業員2人・損害保険・外注なし・クリーニング歴: ミツモアの掲載ページ
// - 料金の実例: ミツモアのクチコミに書かれた金額（2025年5〜6月）
// - 選ばれる理由・FAQ の対応内容: Googleマップとミツモアのクチコミ（原文は載せず、こちらの言葉で要約）
// - 省エネ基準と東京ゼロエミポイント: nippon.com、目黒区の案内
// 代表者名・創業年・出張費など確かめられないことは書かない。自宅兼の可能性があるので住所は丁目までにする。

const MITSUMORE = 'https://meetsmore.com/p/Yn4cezNWDwAdKqlz'

export const site: SiteConfig = {
  company: {
    name: 'エアコンメンテナンス目黒',
    kana: 'えあこんめんてなんすめぐろ',
    tagline: '目黒区のエアコン分解クリーニング',
  },
  contact: {
    phone: '080-3782-5639',
    postalCode: '152-0022',
    address: '東京都目黒区柿の木坂2丁目',
    hours: '毎日 8:00〜20:00',
    schedule: [[8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20]],
    callTip: 'エアコンのメーカー、お掃除機能が付いているか、台数を教えていただくと話が早く進みます。',
  },
  google: {
    placeId: 'ChIJJSJneTP1GGAR1if_IgEsOYs',
    rating: 5,
    count: 95,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E3%82%A8%E3%82%A2%E3%82%B3%E3%83%B3%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E7%9B%AE%E9%BB%92&query_place_id=ChIJJSJneTP1GGAR1if_IgEsOYs',
    photoNotes: [
      { width: 1280, height: 720, title: '天井近くのエアコンを洗う', menu: 'wall', hero: 2 },
      { width: 4800, height: 4800, title: '外した部品の洗浄前と後', menu: 'wall', hero: 1 },
      { width: 1478, height: 1108, title: '壁掛けエアコン', menu: 'auto' },
      { width: 2376, height: 4224, title: '洗ったあとの水', menu: 'wall' },
      { width: 3024, height: 4032, title: '洗ったあとの水（真っ黒）', menu: 'wall', hide: true },
      { width: 4032, height: 3024, title: '洗い終えた壁掛けエアコン', menu: 'auto', hero: 3 },
      { width: 4446, height: 4446, title: '吹き出し口の奥', menu: 'leak', pair: { id: 'outlet', role: 'before' } },
      { width: 1479, height: 1109, title: '天井埋め込みエアコン', menu: 'ceiling' },
      { width: 2376, height: 4224, title: 'フィンとファンのほこり（洗う前）', menu: 'wall' },
      { width: 4446, height: 4446, title: '吹き出し口の奥', menu: 'leak', pair: { id: 'outlet', role: 'after' }, detail: '汚れの固まりを取り除いて、奥まで洗いました' },
    ],
  },
  hero: {
    badge: { icon: 'camera', text: '作業の前と後を、写真でお見せします' },
    catchcopy: 'エアコンの奥まで、\n分解して洗う。',
    lead: '柿の木坂の、2人でやっているエアコン屋です。壁掛けも、お掃除機能付きも、天井埋め込みも。部品を外して奥まで洗い、作業の前と後を写真でお見せします。',
  },
  trust: [
    { icon: 'clock', label: '毎日受付', value: '8:00〜20:00' },
    { icon: 'fan', label: '対応機種', value: '壁掛け・お掃除機能付き・天井埋め込み' },
    { icon: 'shield', label: '作業はすべて自分たちで', value: '外注なし・損害保険あり', href: MITSUMORE, source: 'ミツモアの掲載で確認' },
  ],
  menu: {
    kicker: 'メニュー',
    title: 'どのエアコンで、\n困っていますか？',
    lead: '機種や症状を選ぶと、よくあるお悩みと、エアコンメンテナンス目黒でできることが分かります。',
    items: [
      {
        key: 'wall',
        label: '壁掛けエアコン',
        icon: 'aircon',
        symptoms: ['運転すると、すっぱい・カビっぽいニオイがする', '吹き出し口の奥に、黒い点々が見える', '何年も掃除していない、引っ越してきたばかり'],
        work: 'パネルや部品を外して、熱交換器（アルミのフィン）とファンを洗います。外したフィルターやルーバーも洗ってから戻します。',
      },
      {
        key: 'auto',
        label: 'お掃除機能付き',
        icon: 'sparkle',
        symptoms: ['自動でお掃除するはずなのに、ニオイがする', 'お掃除機能のせいで、自分では奥まで手が届かない'],
        work: 'お掃除ユニットを外してから、奥まで洗います。日立・シャープ・三菱電機などのお掃除機能付きを多く洗っています。',
      },
      {
        key: 'ceiling',
        label: '天井埋め込み',
        icon: 'building',
        symptoms: ['お店や事務所の天井のエアコンがにおう', '吹き出し口のまわりが黒い、ほこりが落ちてくる'],
        work: '天井埋め込み（カセット形）の洗浄の経験が多い店です。業務用のエアコンもご相談ください。',
      },
      {
        key: 'leak',
        label: '水漏れ・点検',
        icon: 'droplet',
        symptoms: ['エアコンから水がポタポタ落ちてくる', '冷えが悪い、前と音が違う'],
        work: 'どこから水が出ているかを確かめて、原因と、これからの対策までご説明します。管理会社を通したご依頼にも伺っています。',
      },
      {
        key: 'bath',
        label: '浴室乾燥機・換気扇',
        icon: 'wind',
        symptoms: ['浴室乾燥機の乾きが悪い、ほこりが出る', '換気扇の音が大きくなった'],
        work: '浴室乾燥機と換気扇も、分解して洗います。エアコンと一緒のご依頼もどうぞ。',
      },
    ],
    options: ['室外機のクリーニング', '抗菌コート', 'ドレンパン（水受け）の掃除', '複数台の割引'],
  },
  prices: {
    title: '料金の実例',
    lead: 'ミツモアに寄せられたクチコミに書かれていた、実際の料金です。台数やオプションで変わります。',
    items: [
      { title: '天井埋め込み（ダイキン）', price: '36,300', note: 'お店のエアコン' },
      { title: 'お掃除機能付き（シャープ）', price: '29,400', note: '壁掛け' },
      { title: 'お掃除機能付き（日立）', price: '25,000', note: '壁掛け' },
      { title: 'お掃除機能付き（三菱電機）', price: '20,000', note: '壁掛け' },
    ],
    source: 'ミツモアのクチコミ（2025年5〜6月）',
    href: MITSUMORE,
  },
  reasons: [
    {
      label: '取りやすい',
      icon: 'calendar',
      title: '混む時期でも、予約が取りやすい。',
      body: '夏の前はエアコン屋がいちばん混む時期です。それでも日程を快く合わせてもらえた、予約のやりとりが丁寧だった、という声が多く届いています。',
      evidence: ['繁忙期なのに、快く日程を調整してくれた', '予約の取りやすさがよかった', '予約のやりとりが丁寧でスムーズだった'],
    },
    {
      label: '見える',
      icon: 'camera',
      title: '立ち会えなくても、写真で分かる。',
      body: '作業の前と後を写真に撮ってお見せします。どれだけ汚れていて、どうきれいになったかが、その場にいなくても分かります。',
      evidence: ['掃除中は家にいなかったが、写真を撮っておいてくれた', '作業の前と後の写真を見せてくれた（ミツモア）'],
    },
    {
      label: '原因まで',
      icon: 'search',
      title: '水漏れは、原因から説明します。',
      body: '水漏れの点検では、今の状態を確かめて原因を突き止め、これから気をつけることまでお話しします。',
      evidence: ['水漏れの原因の特定から、今後の対策まで詳しく説明してくれた', '管理会社に相談した水漏れに、対応してくれた'],
    },
    {
      label: 'また頼みたい',
      icon: 'smile',
      title: '年に2回でも頼みたい、と言われる人柄。',
      body: '気さくに話しながら、ご自分でできるお手入れのこつもお伝えします。小さなお子さんがいるご家庭にも伺っています。',
      evidence: ['社長の人柄も、作業の丁寧さも、料金も最高だった', 'いろいろなアドバイスをもらえて助かった', '子どもがいても優しく丁寧に対応してくれた（ミツモア）'],
    },
  ],
  guide: {
    kicker: 'エアコンの汚れ',
    title: 'そのニオイ、\nカビかもしれません。',
    lead: '冷房や除湿のあと、エアコンの中は湿ったままになりがちです。こんなサインが出たら、クリーニングを考える目安です。',
    checks: [
      { title: '運転を始めると、すっぱい・カビっぽいニオイがする', description: 'ニオイの元は、ファンや熱交換器についたカビやほこりのことが多いです。' },
      { title: '吹き出し口をのぞくと、黒い点々が見える', description: '筒の形をしたファンについたカビです。フィルターの掃除だけでは届きません。' },
      { title: '水がポタポタ落ちる', description: '水受け（ドレンパン）や排水の管が、汚れでつまっていることがあります。' },
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
        { label: '東京ゼロエミポイント（目黒区の案内）', href: 'https://www.city.meguro.tokyo.jp/kankyouhozen/kurashi/kankyou/kateinozeroemi.html' },
        { label: 'エアコンの2027年問題（nippon.com）', href: 'https://www.nippon.com/ja/japan-data/h02851/' },
      ],
    },
  },
  flow: [
    { title: 'お電話・ご予約', description: 'メーカー、お掃除機能の有無、台数を教えてください。日程を決めます。' },
    { title: '養生してから分解', description: '床や壁、家具を汚さないように覆ってから、部品を外します。' },
    { title: '奥まで洗浄', description: '本体の奥まで洗い、外した部品も洗ってから元に戻します。' },
    { title: '写真でご報告', description: '作業の前と後の写真をお見せして、お手入れのこつもお伝えします。' },
  ],
  area: {
    city: '目黒区',
    home: '柿の木坂',
    note: '目黒区の外も、まずはお電話でご相談ください。',
    summary: '目黒区とその周辺',
  },
  faq: [
    { q: '1台だけでも来てもらえますか？', a: 'はい、1台から伺います。台数が多いときは割引があります。' },
    { q: 'お掃除機能付きでも大丈夫ですか？', a: 'はい。お掃除ユニットを外してから洗います。メーカーと型番が分かれば、お電話のときにお知らせください。' },
    { q: '天井埋め込みのエアコンも洗えますか？', a: 'はい。天井埋め込み（カセット形）の洗浄の経験が多い店です。お店や事務所のエアコンもご相談ください。' },
    { q: '作業中、ずっと家にいないといけませんか？', a: 'ずっと立ち会っていただかなくても大丈夫です。作業の前と後は写真に撮ってお見せします。' },
    { q: '賃貸で、管理会社を通した依頼でも大丈夫ですか？', a: 'はい。管理会社からのご相談で、水漏れの点検に伺ったこともあります。' },
    { q: '料金はいくらくらいですか？', a: '機種と台数、オプションで変わります。上の「料金の実例」が目安です。まずは機種と台数をお知らせください。' },
    { q: '損害保険には入っていますか？', a: 'はい、損害保険に入っています。作業はすべて自分たちで行い、外注はしていません。' },
  ],
  profile: [
    { label: '人数', value: '2人' },
    { label: 'クリーニング歴', value: '5年以上' },
    { label: '保険', value: '損害保険に加入' },
  ],
  work: 'エアコンの分解クリーニング（壁掛け・お掃除機能付き・天井埋め込み）、エアコンの水漏れ点検、浴室乾燥機・換気扇の分解洗浄、室外機のクリーニング、抗菌コート',
  contactTitle: 'エアコンのことで困ったら、\nまずはお電話を。',
  site: {
    url: 'https://aircon-meguro.sonnet.co.jp',
    title: 'エアコンメンテナンス目黒｜目黒区のエアコン分解クリーニング・水漏れ点検',
    description:
      '目黒区柿の木坂のエアコン屋、エアコンメンテナンス目黒。壁掛け・お掃除機能付き・天井埋め込みのエアコンを分解して洗い、作業の前と後を写真でお見せします。水漏れの点検、浴室乾燥機・換気扇の洗浄も。毎日8時〜20時受付。',
    schemaType: 'HomeAndConstructionBusiness',
    isProposal: true,
    proposedBy: '合同会社ソネット',
  },
}
