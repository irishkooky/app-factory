/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 写真は Googleマップに依田設備が載せている施工写真を、表示のたびに Places API から取ってくる（src/server/place.ts）。
 * 写真そのものは保存しない（Google Maps Platform の規約）。取れないときは写真なしの見た目に切り替わる。
 */

import type { IconName } from './components/Icon'

/** 困りごとの場所。症状の案内と写真の振り分けに使う */
export type Place = 'kitchen' | 'toilet' | 'bath' | 'outdoor' | 'drain'

/**
 * Googleマップの写真に付ける説明。API が返す並び順（0始まり）で書く。
 * 元画像の幅×高さが合わないときは説明を付けない（先方が写真を足すと並びが変わるため）。
 */
export type PhotoNote = {
  width: number;
  height: number;
  title: string;
  place?: Place;
  /** 写真に書き込まれている金額 */
  price?: string;
  /** 施工前後を並べるときの組（同じ pair の before と after を並べる） */
  pair?: { id: string; role: 'before' | 'after' };
  /** 施工前後の組の下に添える一言（after の写真に書く） */
  detail?: string;
  /** ヒーローに出す順（小さいほど手前） */
  hero?: number;
};

export type SiteConfig = {
  company: {
    name: string;
    kana: string;
    /** ヘッダーのロゴの下に出す短い説明 */
    tagline: string;
  };
  contact: {
    phone: string;
    postalCode: string;
    address: string;
    /** 受付時間の表示用 */
    hours: string;
    /** 曜日ごとの受付時間（日曜を0とする7要素、時の数値、休みは null）。「ただいま受付中」を日本時間で出す */
    schedule: ([number, number] | null)[];
    /** 電話に出られないときの案内（クチコミで確かめた対応） */
    missedCall: string;
  };
  /** 公的な指定・掲載。出典の URL を付ける */
  credentials: { title: string; value: string; source: string; href: string }[];
  google: {
    placeId: string;
    /** API が使えないときに出す値（2026-10-30 時点） */
    rating: number;
    count: number;
    mapsUrl: string;
    photoNotes: PhotoNote[];
  };
  hero: { catchcopy: string; lead: string };
  troubles: {
    key: Place;
    label: string;
    icon: IconName;
    symptoms: string[];
    work: string;
  }[];
  /** 料金の実例。先方が Googleマップの写真に書き込んでいる金額だけを載せる */
  prices: { title: string; price: string; where: string; place: Place; count?: string }[];
  /** 選ばれる理由。evidence はクチコミの要約（原文は載せない） */
  reasons: { label: string; title: string; body: string; evidence: string[]; icon: IconName }[];
  leak: {
    steps: { title: string; description: string }[];
    emergency: string;
    reduction: string[];
    reductionNote: string;
    reductionHref: string;
  };
  flow: { title: string; description: string }[];
  area: { towns: string[]; note: string };
  faq: { q: string; a: string }[];
  work: string;
  site: {
    url: string;
    title: string;
    description: string;
    /** 先回りで作った提案用サンプルなら true（noindex と提案帯） */
    isProposal: boolean;
    proposedBy: string;
  };
};

// ---- 依田設備（神奈川県横浜市金沢区）への提案用 ----
// 文面の根拠（2026-10-30 確認）:
// - 住所・電話・受付時間・評価・写真: Googleマップ（Places API）
// - 指定番号: 横浜市水道局「指定給水装置工事事業者リスト」（令和8年9月15日現在）
// - 漏水修繕リスト: 横浜市水道局「メーター下流側漏水修繕事業者リスト」金沢区（令和8年9月15日現在）
// - 選ばれる理由・FAQ の対応内容: Googleマップのクチコミ（原文は載せず、こちらの言葉で要約）
// 代表者名・創業年・出張費など確かめられないことは書かない。横浜市の排水設備指定工事店の一覧には載っていないので、その指定は書かない。

export const site: SiteConfig = {
  company: {
    name: "依田設備",
    kana: "よだせつび",
    tagline: "金沢区の水まわり修理",
  },
  contact: {
    phone: "090-1551-7518",
    postalCode: "236-0046",
    address: "神奈川県横浜市金沢区釜利谷西1丁目59-12",
    hours: "月〜土 8:00〜20:00／日 8:00〜17:00",
    schedule: [[8, 17], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20]],
    missedCall: "作業中で出られないときは、留守番電話にお名前とご用件を。折り返しお電話します。",
  },
  credentials: [
    {
      title: "横浜市指定給水装置工事事業者",
      value: "指定番号 第5296号",
      source: "横浜市水道局「指定給水装置工事事業者リスト」",
      href: "https://www.city.yokohama.lg.jp/business/bunyabetsu/suido/kyuusui-souchi/tetsuzuki/shiteikojijigyosha.html",
    },
    {
      title: "メーター下流側漏水修繕事業者リスト",
      value: "金沢区で掲載",
      source: "横浜市水道局「メーター下流側漏水修繕事業者リスト」",
      href: "https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/mizumore/karyurisuto-kensaku.html",
    },
  ],
  google: {
    placeId: "ChIJO1fPFCpFGGARiRZY_jfcshs",
    rating: 5,
    count: 18,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=%E4%BE%9D%E7%94%B0%E8%A8%AD%E5%82%99&query_place_id=ChIJO1fPFCpFGGARiRZY_jfcshs",
    photoNotes: [
      { width: 1440, height: 1440, title: "キッチン水栓の交換", place: "kitchen" },
      { width: 4032, height: 3024, title: "キッチン水栓の交換", place: "kitchen", pair: { id: "kitchen", role: "before" } },
      { width: 1440, height: 1440, title: "トイレタンクの中の作業", place: "toilet" },
      { width: 4032, height: 3024, title: "キッチン水栓の交換", place: "kitchen", pair: { id: "kitchen", role: "after" }, detail: "古い蛇口を新しい水栓に取り替えました" },
      { width: 4032, height: 3024, title: "開閉バルブの交換", place: "kitchen", price: "8,800円", hero: 1 },
      { width: 2048, height: 1536, title: "漏水の修理", place: "outdoor", price: "44,000円", hero: 3 },
      { width: 4032, height: 3024, title: "排水桝の交換", place: "drain", price: "66,000円", hero: 2 },
      { width: 1440, height: 1440, title: "管内カメラで排水管を確認", place: "drain" },
      { width: 1440, height: 1080, title: "開閉バルブの交換（作業中）", place: "kitchen" },
      { width: 1440, height: 1080, title: "漏水の修理（メーターまわり）", place: "outdoor", price: "44,000円" },
    ],
  },
  hero: {
    catchcopy: "金沢区の水まわりを、\n早く、正直に。",
    lead: "釜利谷西の水道屋、依田設備です。蛇口のポタポタやトイレのつまりから、地面の下の水道管の漏水まで。伺って状態を見たら、作業の前に金額をお伝えします。",
  },
  troubles: [
    {
      key: "kitchen",
      label: "キッチン",
      icon: "faucet",
      symptoms: ["蛇口を閉めてもポタポタ止まらない", "蛇口の根元やシンクの下から水が漏れる", "レバーが固い、水の切り替えがおかしい", "古い型で、部品がないと言われた"],
      work: "パッキンや部品の交換で直るものは、部品だけ替えます。蛇口ごとの交換もできます。古い蛇口は、合う部品を探して直せることがあります。",
    },
    {
      key: "toilet",
      label: "トイレ",
      icon: "toilet",
      symptoms: ["つまって水が流れない、あふれそう", "タンクの水が止まらない、たまらない", "便器やタンクのまわりが濡れている"],
      work: "つまりは専用の器具で取り除きます。タンクの中の部品の不具合も直します。",
    },
    {
      key: "bath",
      label: "お風呂・洗面",
      icon: "shower",
      symptoms: ["シャワーや蛇口から水が漏れる", "洗面台の下が濡れている", "お湯と水の切り替えがうまくいかない"],
      work: "水栓の部品の交換や、水栓ごとの交換をします。給湯の配管まわりの水漏れもご相談ください。",
    },
    {
      key: "outdoor",
      label: "地中の水道管",
      icon: "shovel",
      symptoms: ["検針で「漏水の可能性」の通知が入っていた", "水道代が急に上がった", "家のまわりの地面がいつも湿っている", "水を使っていないのにメーターが回る"],
      work: "漏れている場所を探して、掘って直します。家のまわりがコンクリートでも対応します。直したあとは、水道局に出す申請書の作成もお手伝いします。",
    },
    {
      key: "drain",
      label: "排水管・排水桝",
      icon: "pipe",
      symptoms: ["排水の流れが悪い、ゴボゴボ音がする", "外の排水桝からあふれる、臭う", "排水桝が古くなって割れている"],
      work: "管内カメラで排水管の中を確かめてから、原因に合った直し方をご提案します。排水桝の交換もしています。",
    },
  ],
  prices: [
    { title: "開閉バルブの交換", price: "8,800", where: "キッチン", place: "kitchen" },
    { title: "漏水の修理", price: "44,000", where: "地中の給水管", place: "outdoor", count: "2件" },
    { title: "排水桝の交換", price: "66,000", where: "屋外の排水", place: "drain" },
  ],
  reasons: [
    {
      label: "早い",
      icon: "zap",
      title: "朝のお電話で、その日のうちに。",
      body: "電話に出られないときも、留守電を聞いて折り返します。ホームセンターでは修理まで1か月と言われたキッチンの水漏れを、2日で直したこともあります。",
      evidence: ["朝にトイレのつまりで電話して、その日のうちに直してもらえた", "大手に頼むより早く、2日後には修理が終わった"],
    },
    {
      label: "正直",
      icon: "yen",
      title: "金額は、作業の前に。",
      body: "伺って状態を見たら、直し方と金額をご説明します。作業はご納得いただいてから。必要のない交換はおすすめしません。",
      evidence: ["直す前に金額の説明があった", "無理に勧めず、こちらの立場で方法を考えてくれた", "部品代と修理代を合わせても、ホームセンターと変わらなかった"],
    },
    {
      label: "あきらめない",
      icon: "search",
      title: "古い部品も、探して直す。",
      body: "「交換しかない」と言われた古い蛇口も、合う部品が見つかれば直せます。25年ほど前の部品を探し出して修理したこともあります。",
      evidence: ["四半世紀前の部品を見つけて直してくれた"],
    },
    {
      label: "最後まで",
      icon: "file",
      title: "水道局の書類まで。",
      body: "地中の漏水は、場所を探して直したあと、水道料金の減額に必要な申請書の作成と提出までお手伝いします。",
      evidence: ["漏れている場所を見つけて直し、水道局への書類も出してくれた", "後日、漏水していた期間の料金が安くなった"],
    },
  ],
  leak: {
    steps: [
      { title: "家じゅうの蛇口を閉める", description: "キッチン、お風呂、洗面、トイレ、外の水栓も。洗濯機や食洗機も止めます。" },
      { title: "メーターのパイロットを見る", description: "メーターボックスのふたを開けて、銀色の小さなコマ（パイロット）を見ます。" },
      { title: "回っていたら、漏水のサイン", description: "水を使っていないのに回っていれば、どこかで漏れています。お電話ください。" },
    ],
    emergency: "メーターボックスの中の止水栓を閉めると、家じゅうの水が止まります。慌てずに水を止めてから、お電話ください。",
    reduction: [
      "地面の下や壁の中など、見えないところの水漏れは、条件を満たすと、横浜市水道局の制度で水道料金が減額されることがあります。",
      "修理のあとに「漏水に伴う使用水量認定申請書」を、修理の請求書や領収書の写しと一緒に水道事務所へ出します。依田設備は、申請書の作成と提出もお手伝いします。",
    ],
    reductionNote: "減額されるのは漏水で増えた水量の一部で、修理代の補助ではありません。蛇口の閉め忘れなどは対象外です。",
    reductionHref: "https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/ryokin/rousuigengaku.html",
  },
  flow: [
    { title: "お電話", description: "どこで、どんなふうに困っているかをお聞かせください。出られないときは折り返します。" },
    { title: "伺って確認", description: "状態を見て、直し方と金額をご説明します。" },
    { title: "修理", description: "ご納得いただいてから作業します。" },
    { title: "書類のお手伝い", description: "漏水のときは、水道局に出す申請書の作成もお手伝いします。" },
  ],
  area: {
    towns: ["能見台", "富岡西", "富岡東", "並木", "西柴", "釜利谷東", "釜利谷南", "釜利谷町", "六浦", "瀬戸", "大道", "朝比奈町", "谷津町", "泥亀", "柴町", "幸浦", "堀口", "高舟台"],
    note: "金沢区の外も、まずはお電話でご相談ください。",
  },
  faq: [
    { q: "日曜日も来てもらえますか？", a: "日曜日も8時から17時まで受け付けています。月曜日から土曜日は8時から20時までです。" },
    { q: "電話がつながらないときは？", a: "作業中で出られないことがあります。留守番電話にお名前とご用件を残してください。折り返しお電話します。" },
    { q: "費用はいつわかりますか？", a: "伺って状態を見てから、直し方と金額をご説明します。作業はご納得いただいてから始めます。" },
    { q: "漏水を直したら、水道料金は安くなりますか？", a: "地面の下や壁の中など見えないところの漏水で、条件を満たすときは、横浜市水道局の制度で減額されることがあります。申請書の作成と提出もお手伝いします。" },
    { q: "水道局の指定工事店ですか？", a: "はい。横浜市指定給水装置工事事業者です（指定番号 第5296号）。横浜市水道局の「メーター下流側漏水修繕事業者リスト」にも載っています。" },
    { q: "古い蛇口でも直せますか？", a: "合う部品を探して直せることがあります。型番がわかれば、お電話のときにお知らせください。" },
    { q: "どのあたりまで来てもらえますか？", a: "釜利谷西から、金沢区とその周辺に伺います。それ以外の地域もご相談ください。" },
  ],
  work: "水まわりの修理（キッチン・トイレ・お風呂・洗面）、蛇口・水栓の交換、漏水の調査と修理、給水管の工事、排水管の確認と排水桝の交換",
  site: {
    url: "https://yoda-setsubi.sonnet.co.jp",
    title: "依田設備｜横浜市金沢区の水道修理・漏水修理（横浜市指定工事店）",
    description:
      "横浜市金沢区釜利谷西の水道屋、依田設備。横浜市指定給水装置工事事業者（第5296号）。蛇口の水漏れ、トイレのつまり、地中の漏水の修理と、水道局への減額申請のお手伝いまで。日曜も受付。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
