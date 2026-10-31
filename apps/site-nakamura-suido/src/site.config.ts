/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真と★は、先方が Googleマップに載せているものを表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** メニューの種類。写真の振り分けにも使う */
export type MenuKey = 'leak' | 'clog' | 'faucet' | 'washer'

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
    /** Googleマップに写真が無い店で、写真の代わりにヒーローに出すクチコミの要約 */
    voices?: string[]
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

// ---- 中村水道設備（東京都練馬区貫井）への提案用 ----
// 文面の根拠（2026-10-31 確認）:
// - 住所・電話・受付時間・評価: Googleマップ（Places API）。Googleマップに写真は無い
// - 選ばれる理由・FAQ の対応内容・ヒーローの声: Googleマップのクチコミ（原文は載せず、こちらの言葉で要約）
// - 水漏れの調べ方と、放っておいたときの料金の目安: 東京都水道局「漏水は早期発見・早期修繕を！」
// 料金表・代表者名・創業年・指定工事店の番号など確かめられないことは書かない。自宅兼の可能性があるので住所は丁目までにする。

const TOKYO_LEAK = 'https://www.waterworks.metro.tokyo.lg.jp/kurashi/trouble/rousui/souki'

export const site: SiteConfig = {
  company: {
    name: '中村水道設備',
    kana: 'なかむらすいどうせつび',
    tagline: '練馬区の水道修理・水漏れ・つまり',
  },
  contact: {
    phone: '090-6034-5778',
    postalCode: '176-0021',
    address: '東京都練馬区貫井3丁目',
    hours: '月〜金 8:00〜21:00／土 9:00〜19:00（日曜定休）',
    schedule: [null, [8, 21], [8, 21], [8, 21], [8, 21], [8, 21], [9, 19]],
    callTip: 'どこから、どんなふうに水が漏れているか（つまっているか）を教えていただくと、お電話で金額の目安をお伝えできます。',
  },
  google: {
    placeId: 'ChIJXRHnn2XtGGARA5rhy8fsgXs',
    rating: 4.9,
    count: 17,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E4%B8%AD%E6%9D%91%E6%B0%B4%E9%81%93%E8%A8%AD%E5%82%99&query_place_id=ChIJXRHnn2XtGGARA5rhy8fsgXs',
    photoNotes: [],
  },
  hero: {
    badge: { icon: 'phone', text: 'お電話で、症状から金額をお伝えします' },
    catchcopy: '金額を先に伝えてから、\n直します。',
    lead: '練馬区貫井の水道屋です。水漏れ、つまり、蛇口や洗濯機の水栓の修理。お電話で症状を伺って、作業の前に金額をお伝えしてから直します。',
    voices: ['電話で言われた料金のとおりで、安心した', '現場でも、電話の見積もり以上は取られなかった', '施工の前に価格を教えてくれるので、安心できた'],
  },
  trust: [
    { icon: 'yen', label: '料金', value: '作業の前にお伝えします' },
    { icon: 'clock', label: '受付（土は9〜19時・日曜定休）', value: '月〜金 8〜21時' },
    { icon: 'faucet', label: 'おもな修理', value: '水漏れ・つまり・蛇口' },
  ],
  menu: {
    kicker: 'メニュー',
    title: 'どこの水まわりで、\n困っていますか？',
    lead: '場所を選ぶと、よくあるお悩みと、中村水道設備でできることが分かります。',
    items: [
      {
        key: 'leak',
        label: '水漏れ',
        icon: 'droplet',
        symptoms: ['蛇口の根もとや、シンクの下が濡れている', '水を止めても、ポタポタ落ちる', '水道代が急に高くなった'],
        work: 'どこから漏れているかを確かめて、パッキンや部品を替えて直します。直す場所と替える部品を、作業の前にご説明します。',
      },
      {
        key: 'clog',
        label: 'つまり',
        icon: 'pipe',
        symptoms: ['キッチンの流しの水が流れない', 'お箸など、物を落としてつまらせた'],
        work: 'キッチンの排水のつまりを直します。お箸がつまったキッチンに、すぐ伺ったこともあります。',
      },
      {
        key: 'faucet',
        label: '蛇口・水の出',
        icon: 'faucet',
        symptoms: ['蛇口が固くて回らない', '何年も前から、水の出が悪い'],
        work: '蛇口の修理や交換をします。キッチンの水の出の悪さを、先に金額をお伝えしてから直したこともあります。',
      },
      {
        key: 'washer',
        label: '洗濯機の水栓',
        icon: 'wrench',
        symptoms: ['洗濯機の蛇口から水が漏れる', '洗濯機の蛇口が回らない'],
        work: '洗濯機用の水栓の水漏れや、回らなくなった蛇口を直します。クチコミでも多いご依頼です。',
      },
    ],
    options: [],
  },
  reasons: [
    {
      label: '先に料金',
      icon: 'yen',
      title: '金額は、作業の前に。',
      body: 'お電話で症状を伺い、作業の前に金額をお伝えします。電話で伝えた金額のとおりだった、それ以上は取られなかった、という声をいただいています。',
      evidence: ['電話で見積もってもらい、現場でもそれ以上は取られなかった', '電話で言われた料金のとおりで安心した', '施工の前に価格を教えてくれるので安心だった'],
    },
    {
      label: '早い',
      icon: 'zap',
      title: '「すぐ来てくれた」という声。',
      body: '水まわりの困りごとは急ぎです。すぐに来てくれた、手際がよく早く終わった、という声が届いています。',
      evidence: ['キッチンのつまりに、すぐ来てくれた', '手際がよく、時間も早かった', '洗濯機の蛇口が回らなくなって、迅速に対応してくれた'],
    },
    {
      label: '説明',
      icon: 'search',
      title: 'どこを直すか、何を替えるか。',
      body: '修理する場所と交換する部品を、作業しながらご説明します。お電話の段階から、分かりやすくお話しします。',
      evidence: ['修理する場所と交換する部品を、細かく説明してくれた', '事前の電話での説明が、丁寧でわかりやすかった'],
    },
    {
      label: '良心的',
      icon: 'smile',
      title: 'また頼みたい、と言われる料金と人柄。',
      body: '料金が良心的だった、感じのよい職人さんだった、という声が続いています。ついでに気になっていた場所も、先に金額をお伝えしてから直します。',
      evidence: ['料金が良心的だった（いくつものクチコミ）', '長年水の出が悪かったキッチンの水道も、先に価格を伝えて直してくれた', 'とても感じのよい職人さんだった'],
    },
  ],
  guide: {
    kicker: '水漏れの調べ方',
    title: '見えない水漏れは、\nメーターで分かります。',
    lead: '水道代が急に上がったら、どこかで漏れているかもしれません。東京都水道局が案内している、ご自分でできる調べ方です。',
    checks: [
      { title: '家じゅうの蛇口を閉めて、水を使わない状態にする', description: '水を使っていない状態で、メーターを確かめます。' },
      { title: '水道メーターの「パイロット」を見る', description: 'メーターの中で、水が流れると回る小さな部品です。' },
      { title: 'パイロットが回っていたら、漏れています', description: '水を使っていないのに回っている（点滅している）なら、メーターから蛇口までのどこかで漏れています。' },
      { title: '急いで止めたいときは、メーターの止水栓', description: 'メーターボックスの中の止水栓を、右（時計回り）に回すと水が止まります。' },
    ],
    tip: {
      title: '漏れていたら、早めにご連絡ください',
      body: 'どこで漏れているか分からなくても大丈夫です。症状を伺って、作業の前に金額をお伝えします。',
    },
    side: {
      kicker: '放っておくと',
      title: '小さな水漏れでも、1か月でこれだけかかります。',
      body: [
        '蛇口から糸のように細く（1ミリくらい）漏れていると、1か月で約6m³、約1,800円。2ミリくらいだと約16m³、約5,500円。',
        'トイレで便器の中の水面がわずかに動いているだけでも、1か月で約150m³、約69,000円になることがあります。',
        '（東京都水道局の目安。メーターの口径20ミリ、1か月の使用水量24m³の場合。下水道料金を含み、消費税を除く）',
      ],
      note: '「ポタポタくらいなら」と放っておかずに、早めにご相談ください。作業の前に金額をお伝えします。',
      links: [{ label: '漏水は早期発見・早期修繕を！（東京都水道局）', href: TOKYO_LEAK }],
    },
  },
  flow: [
    { title: 'お電話で症状を伺う', description: 'どこから、どんなふうに漏れているか（つまっているか）を教えてください。' },
    { title: '先に金額をお伝えする', description: '症状から、作業の前に金額をお伝えします。' },
    { title: '伺って、直す', description: '修理する場所と交換する部品をご説明しながら、手際よく直します。' },
    { title: '直ったか確かめる', description: '水が止まったか、流れるようになったかを、一緒に確かめます。' },
  ],
  area: {
    city: '練馬区',
    home: '貫井',
    note: '練馬区の外も、まずはお電話でご相談ください。',
    summary: '練馬区とその周辺',
  },
  faq: [
    { q: '電話で料金は分かりますか？', a: '症状を伺って、作業の前に金額をお伝えします。どこから、どんなふうに漏れているか（つまっているか）を教えてください。' },
    { q: '洗濯機の蛇口の水漏れも直せますか？', a: 'はい。洗濯機用の水栓の水漏れや、固くて回らなくなった蛇口の修理をしています。' },
    { q: 'キッチンのつまりも頼めますか？', a: 'はい。お箸がつまったキッチンの排水を直したこともあります。' },
    { q: '水道代が急に高くなりました。', a: '上の「水漏れの調べ方」で、メーターのパイロットを見てください。回っていたら、どこかで漏れています。場所が分からなくてもご相談ください。' },
    { q: '日曜日も来てもらえますか？', a: '日曜日は定休日です。月〜金は8時〜21時、土曜は9時〜19時に受け付けています。' },
  ],
  profile: [],
  work: '水漏れの修理、キッチンなど排水のつまりの修理、蛇口の修理・交換、洗濯機用水栓の修理',
  contactTitle: '水まわりで困ったら、\nまずはお電話を。',
  site: {
    url: 'https://nakamura-suido.sonnet.co.jp',
    title: '中村水道設備｜練馬区の水道修理・水漏れ・つまり・蛇口',
    description:
      '練馬区貫井の水道屋、中村水道設備。水漏れ、キッチンのつまり、蛇口や洗濯機の水栓の修理。お電話で症状を伺い、作業の前に金額をお伝えしてから直します。月〜金8時〜21時、土9時〜19時受付。',
    schemaType: 'Plumber',
    isProposal: true,
    proposedBy: '合同会社ソネット',
  },
}
