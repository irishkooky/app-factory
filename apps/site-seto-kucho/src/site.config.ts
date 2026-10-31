/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真と★は、先方が Googleマップに載せているものを表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** メニューの種類。写真の振り分けにも使う */
export type MenuKey = 'install' | 'replace' | 'move' | 'repair'

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

// ---- 瀬戸空調工事（東京都町田市大蔵町）への提案用 ----
// 文面の根拠（2026-10-31 確認）:
// - 住所・電話・評価・写真: Googleマップ（Places API）。受付時間は Googleマップに無いので書かない
// - フロンガスの回収: 先方が載せた写真（回収の工事看板）
// - 選ばれる理由・FAQ の対応内容: Googleマップのクチコミ（原文は載せず、こちらの言葉で要約）
// - 省エネ基準と東京ゼロエミポイント: nippon.com、東京ゼロエミポイント公式、BCN（2026年3月）
// 料金・代表者名・創業年・資格など確かめられないことは書かない。自宅兼の可能性があるので住所は番地を出さない。

export const site: SiteConfig = {
  company: {
    name: '瀬戸空調工事',
    kana: 'せとくうちょうこうじ',
    tagline: '町田市のエアコン取り付け・交換',
  },
  contact: {
    phone: '090-3908-2308',
    postalCode: '195-0062',
    address: '東京都町田市大蔵町',
    hours: '',
    // Googleマップに受付時間が無いので、「ただいま受付中」は出さない
    schedule: [],
    callTip: 'エアコンを付けたい部屋と、室外機を置く場所（ベランダ・地面など）、今のエアコンの年数を教えていただくと話が早く進みます。',
  },
  google: {
    placeId: 'ChIJve4HUBX7GGARa21QNNMtXSE',
    rating: 4.8,
    count: 22,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E7%80%AC%E6%88%B8%E7%A9%BA%E8%AA%BF%E5%B7%A5%E4%BA%8B&query_place_id=ChIJve4HUBX7GGARa21QNNMtXSE',
    photoNotes: [
      { width: 1600, height: 1783, title: 'お客さまのお宅', hide: true },
      { width: 2160, height: 3840, title: '室外機の取り外しの前に、フロンガスを回収', menu: 'replace', hero: 1 },
      { width: 960, height: 1280, title: 'フロンガス（R-22）の回収', menu: 'replace', hero: 2 },
    ],
  },
  hero: {
    badge: { icon: 'wrench', text: '量販店で断られた工事も、ご相談ください' },
    catchcopy: 'エアコンの取り付けは、\n配管で差が出る。',
    lead: '町田市大蔵町のエアコン工事屋です。取り付け、買い替えの交換、移設と処分まで。配管をきれいに通し、使える部品は使って、費用を抑えます。',
  },
  trust: [
    { icon: 'aircon', label: 'おもな工事', value: '取り付け・交換・移設' },
    { icon: 'shield', label: '古いエアコンは', value: 'フロンガスを回収してから' },
    { icon: 'yen', label: '費用', value: '使える部品は使う' },
  ],
  menu: {
    kicker: 'メニュー',
    title: 'エアコンの、\nどんな工事ですか？',
    lead: '工事の種類を選ぶと、よくあるお悩みと、瀬戸空調工事でできることが分かります。',
    items: [
      {
        key: 'install',
        label: '取り付け',
        icon: 'aircon',
        symptoms: ['ネットで買ったエアコンを付けてほしい', '新しい部屋にエアコンを付けたい', '量販店の工事で「できない」と言われた'],
        work: '室内機から室外機まで、配管をきれいに通して取り付けます。どの機種を買えばいいかの相談にも乗ります。',
      },
      {
        key: 'replace',
        label: '買い替え・交換',
        icon: 'zap',
        symptoms: ['10年以上使っていて、冷えや暖まりが悪い', '補助金を使って買い替えたい', '2台、3台とまとめて替えたい'],
        work: '古いエアコンを外し、フロンガスを回収してから、新しいエアコンを取り付けます。使える部品はそのまま使って、工事費を抑えます。',
      },
      {
        key: 'move',
        label: '移設・処分',
        icon: 'box',
        symptoms: ['別の部屋にエアコンを移したい', '使わなくなったエアコンを処分したい', '室外機の置き場所を変えたい'],
        work: '取り外し、移設、処分をお受けします。2階のベランダの室外機を地面に降ろすような工事もしています。',
      },
      {
        key: 'repair',
        label: '調子が悪い',
        icon: 'search',
        symptoms: ['エアコンの調子が悪い', '空調まわり、電気まわりで気になることがある'],
        work: 'まずは見て、直せるところは直します。買い替えたほうがいいかどうかも、正直にお話しします。',
      },
    ],
    options: [],
  },
  reasons: [
    {
      label: '仕上がり',
      icon: 'wrench',
      title: '配管まで、手を抜かない。',
      body: 'エアコンは配管の通し方で、見た目も長持ちも変わります。素人目にもきれいな仕上がりだった、という声をいただいています。工事中は、まわりが汚れないよう気を配ります。',
      evidence: ['配管の処理が、素人目にもきれいな仕上がりだった', '工事中も、まわりが汚れないよう配慮してくれた', '細かい部分まで手を抜かない仕事だった'],
    },
    {
      label: '難しい工事',
      icon: 'building',
      title: '量販店で断られた工事も。',
      body: 'はしごが立てにくい、壁の穴を広げる必要があるなどで、量販店の工事では断られる家があります。そうした工事もご相談ください。',
      evidence: ['量販店の工事で「できない」と言われた家に、取り付けてくれた', '2階のベランダの室外機を地面に降ろす難しい工事を、1日で2台仕上げてくれた'],
    },
    {
      label: '費用',
      icon: 'yen',
      title: '使える部品は、使う。',
      body: 'まだ使える部品はそのまま使って、工事費を抑えます。明朗会計だった、という声もいただいています。',
      evidence: ['使える部品をそのまま使って、工事費を節約してくれた', '明朗会計で、使える部分は使ってくれた', 'ネットで買って取り付けてもらうほうが、量販店より安く済んだ'],
    },
    {
      label: '近所の頼れる人',
      icon: 'smile',
      title: '2回目、3回目と頼まれる。',
      body: '前の工事が丁寧だったからと、またご依頼をいただくことが多い店です。移設を頼まれたついでに、調子の悪かった設備を直したこともあります。',
      evidence: ['2回目の利用。前回が丁寧だったので、今回も安心して任せた', '移設と処分を頼んだら、調子の悪かった設備も直してくれた', '空調や電気のことは、今後もずっとお願いするつもり'],
    },
  ],
  guide: {
    kicker: '買い替えの目安',
    title: 'そのエアコン、\n替えどきかもしれません。',
    lead: 'エアコンは長く使えますが、古くなると電気代がかさみ、急に止まることもあります。こんなサインが出たら、買い替えを考える目安です。',
    checks: [
      { title: '使い始めて10年以上たっている', description: '部品が手に入りにくくなり、壊れたときに直せないことが増えてきます。' },
      { title: '冷えが悪い、暖まるまで時間がかかる', description: '掃除をしても変わらないなら、本体が弱ってきている印かもしれません。' },
      { title: '前と違う音がする、水が漏れる', description: '急に止まる前に、一度見てもらうと安心です。' },
      { title: '電気代が前より高い', description: '新しい省エネの機種に替えると、毎月の電気代が下がることがあります。' },
    ],
    tip: {
      title: '夏の前は、工事が混みます',
      body: '暑くなってから壊れると、工事まで何週間も待つことがあります。替えるなら、涼しいうちに日程を決めておくのがおすすめです。',
    },
    side: {
      kicker: '買い替えを考えている方へ',
      title: '2027年4月から、エアコンの基準が変わります。',
      body: [
        '家庭用エアコンの省エネの基準が厳しくなり、安い機種が減って値上がりすると見込まれています。そのため2026年は買い替えが増えています。',
        '東京都の「東京ゼロエミポイント」は、省エネのエアコンを登録されたお店で買うと、その場で値引きされる仕組みです。2027年3月31日まで続きます（予算がなくなると早く終わることがあります）。',
      ],
      note: '補助金を使うか、ネットで買って工事だけ頼むか。どちらが安くなるかは家によって違うので、買う前にご相談ください。',
      links: [
        { label: '東京ゼロエミポイント（公式）', href: 'https://www.tz-points.jp/' },
        { label: 'エアコンの2027年問題（nippon.com）', href: 'https://www.nippon.com/ja/japan-data/h02851/' },
      ],
    },
  },
  flow: [
    { title: 'お電話でご相談', description: '付けたい部屋、室外機の置き場所、今のエアコンの年数を教えてください。' },
    { title: 'お見積もり', description: '配管の通り道と室外機の置き場所を確かめて、工事の内容と金額をお伝えします。' },
    { title: '取り外し・取り付け', description: '古いエアコンはフロンガスを回収してから外し、配管をきれいに通して取り付けます。' },
    { title: '動作の確認', description: '冷房と暖房が動くことを確かめて、使い方をお伝えします。' },
  ],
  area: {
    city: '町田市',
    home: '大蔵町',
    note: '町田市の外も、まずはお電話でご相談ください。',
    summary: '町田市とその周辺',
    rings: [3, 6],
  },
  faq: [
    { q: 'ネットで買ったエアコンの取り付けだけでも頼めますか？', a: 'はい。ネット通販で買ったエアコンを取り付けたこともあります。どの機種を買えばいいかも、ご相談ください。' },
    { q: '量販店で「工事できない」と言われました。', a: 'まずはご相談ください。はしごが立てにくい、室外機の置き場所が難しいといったお宅の工事もしています。' },
    { q: '古いエアコンの処分もできますか？', a: 'はい。取り外しと処分をお受けしています。フロンガスは回収してから外します。' },
    { q: '補助金（東京ゼロエミポイント）は使えますか？', a: '登録されたお店で買うときに値引きされる仕組みです。対象のお店や条件は、公式サイトでご確認ください。どこで買うかで工事の頼み方が変わるので、買う前にご相談いただくと安心です。' },
    { q: '費用はいくらくらいですか？', a: '機種、配管の長さ、室外機の置き場所で変わります。お宅の様子を確かめてからお伝えします。使える部品は使って、費用を抑えます。' },
  ],
  profile: [],
  work: 'エアコンの取り付け、買い替えの交換工事、移設・取り外し・処分（フロンガスの回収）、エアコンや空調まわりの点検・修理',
  contactTitle: 'エアコンの工事のことなら、\nまずはお電話を。',
  site: {
    url: 'https://seto-kucho.sonnet.co.jp',
    title: '瀬戸空調工事｜町田市のエアコン取り付け・交換・移設',
    description:
      '町田市大蔵町のエアコン工事屋、瀬戸空調工事。エアコンの取り付け、買い替えの交換、移設と処分まで。配管をきれいに通し、使える部品は使って費用を抑えます。量販店で断られた工事もご相談ください。',
    schemaType: 'HVACBusiness',
    isProposal: true,
    proposedBy: '合同会社ソネット',
  },
}
