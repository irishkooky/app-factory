/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 別の会社のサイトを作るときは、このファイルと public/images/ の写真だけを差し替える。
 * 項目の意味は SiteConfig の型コメントを参照。省略可能（?）な項目は、省くとセクションごと消える。
 */

import type { IconName } from './components/Icon'

export type Photo = {
  /** public/ からのパス（例: /images/hero.jpg） */
  src: string;
  alt: string;
  /** object-position。人物や建物が切れるときに調整する（例: "center 30%"） */
  position?: string;
};

export type SiteConfig = {
  company: {
    /** 正式な会社名（例: 有限会社 森田工務店） */
    name: string;
    /** ヘッダーなどで使う短い呼び名（例: 森田工務店） */
    shortName: string;
    /** 業種（例: 工務店・住まいのリフォーム）。ヒーローの小見出しと title に出る */
    industry: string;
    /** 代表者（例: 代表取締役 森田 浩二） */
    representative?: string;
    /** 創業・設立（例: 1987年） */
    founded?: string;
    /** 従業員数など、会社概要に足したい行 */
    extraRows?: { label: string; value: string }[];
  };
  contact: {
    /** 表示用の電話番号。tel: リンクにも使う */
    phone: string;
    email?: string;
    /** 郵便番号なしの住所 */
    address: string;
    postalCode?: string;
    /** 営業時間（例: 8:00〜18:00） */
    hours: string;
    /**
     * 曜日ごとの受付時間（日曜を0とする7要素、時の数値、休みは null）。
     * あると「ただいま受付中」を日本時間で出す
     */
    schedule?: ([number, number] | null)[];
    /** 定休日（例: 日曜・祝日） */
    holidays?: string;
    /** 地図の検索語。省略時は住所で Google マップを埋め込む */
    mapQuery?: string;
  };
  hero: {
    /** 大見出し。改行したい位置に \n を入れる */
    catchcopy: string;
    lead: string;
    photo: Photo;
    /** 見出しの下に並べる短い安心材料（例: 見積もり無料） */
    badges?: string[];
  };
  /** ヒーロー直下の数字（例: 創業 / 38 / 年）。3つが収まりよい */
  stats?: { label: string; value: string; unit?: string }[];
  about: {
    title: string;
    /** 段落ごとに1要素 */
    body: string[];
    photo?: Photo;
    /** 文末の署名（例: 代表取締役 森田 浩二） */
    signature?: string;
  };
  services: {
    title: string;
    description: string;
    photo?: Photo;
    /** 例: 修理 1万円〜 / 浴室交換 80万円〜 */
    price?: string;
  }[];
  strengths: { title: string; description: string; photo?: Photo; icon?: IconName }[];
  /** 「こんな症状ありませんか」。お客様が困っている場面から電話につなげる */
  symptoms?: { title: string; description: string; icon: IconName }[];
  /**
   * Google マップの評価と、クチコミに多く書かれていることの要約。
   * クチコミの原文は転載しない（著作権）。こちらで要約した言葉で書く
   */
  reviews?: { rating: string; count: number; mapsUrl: string; points: { title: string; description: string; icon: IconName }[] };
  /** 自分でできる確認の手順（例: 漏水のセルフチェック） */
  selfCheck?: { title: string; lead: string; steps: { title: string; description: string }[]; note?: string };
  /** 対応エリアの地名。地図の代わりに並べて「うちの近所だ」と分かるようにする */
  area?: { title: string; places: string[]; note?: string };
  /** 施工事例・メニュー・店内など。不要なら省略するとセクションとナビから消える */
  gallery?: {
    title: string;
    items: (Photo & { title: string; meta?: string })[];
  };
  /** ご依頼の流れ */
  flow?: { title: string; description: string }[];
  /** お客様の声。Google マップの口コミを本人の許可を得て載せる想定 */
  voices?: { body: string; name: string; meta?: string }[];
  faq?: { q: string; a: string }[];
  theme: {
    /** メインカラー（ボタン・見出しのアクセント） */
    primary: string;
    /** メインカラーの濃い版（文字・ホバー・問い合わせ帯） */
    primaryDark: string;
    /** セクション背景に敷く淡い色 */
    soft: string;
    /** 小見出しや数字に使う差し色 */
    accent: string;
  };
  site: {
    /** 公開 URL。canonical と sitemap に使う */
    url: string;
    description: string;
    /**
     * 先回りで作った提案用サンプルなら true。
     * 検索エンジンに載せない（noindex）うえ、ページ上部に「ご提案用のサンプルです」の帯を出す。
     * 契約して本公開するときに false にする。
     */
    isProposal: boolean;
    /** 提案帯に出す制作者名 */
    proposedBy: string;
  };
};

// ---- 依田設備（神奈川県横浜市金沢区）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。
// クチコミは原文を載せず、多く書かれていることをこちらの言葉で要約する（2026-10-30 時点の Google マップ）。

export const site: SiteConfig = {
  company: {
    name: "依田設備",
    shortName: "依田設備",
    industry: "水まわりの修理・水道設備",
    extraRows: [{ label: "対応エリア", value: "横浜市金沢区とその周辺" }],
  },
  contact: {
    phone: "090-1551-7518",
    postalCode: "236-0046",
    address: "神奈川県横浜市金沢区釜利谷西1丁目59-12",
    hours: "月〜土 8:00〜20:00／日 8:00〜17:00",
    schedule: [[8, 17], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20]],
  },
  hero: {
    catchcopy: "水のトラブル、\nその日のうちに\n伺います。",
    lead: "横浜市金沢区の水道屋です。キッチンの水漏れ、トイレのつまり、給湯の配管まで。お電話をいただいたら、できるだけ早く見に伺います。",
    photo: { src: "/images/hero.jpg", alt: "流し台の下で配管を締め直す手元", position: "center center" },
    badges: ["日曜も受付", "作業の前に金額をご説明", "古い部品もご相談を"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "18", unit: "件" },
    { label: "受付", value: "毎日", unit: "" },
  ],
  about: {
    title: "困ったときに、すぐ来てくれる水道屋に。",
    body: [
      "依田設備は、横浜市金沢区で水まわりの修理をしている設備屋です。蛇口の交換やトイレのつまりから、地面の下の水道管の漏水まで、ご家庭の水のトラブルをお受けしています。",
      "まず状態をよく見て、必要な工事だけをご提案します。古い型の蛇口や部品も、合うものを探して直せる場合があります。",
      "漏水の修理のあとは、水道局への届け出の書類もお手伝いします。",
    ],
    photo: { src: "/images/about.jpg", alt: "工具を持って作業する設備屋の手元" },
  },
  services: [
    {
      title: "キッチン・洗面の水漏れ",
      description: "蛇口からのポタポタ、シンク下の水漏れ、蛇口ごとの交換。部品だけで直せるものは部品の交換で直します。",
      photo: { src: "/images/service-1.jpg", alt: "キッチンの流し台と蛇口" },
    },
    {
      title: "トイレのつまり・給湯の配管",
      description: "トイレや排水のつまり、浴室の給湯管からの水漏れなど。お電話の内容によっては、当日に伺えます。",
      photo: { src: "/images/service-2.jpg", alt: "配管をつなぐ作業の手元" },
    },
    {
      title: "漏水の調査と修理",
      description: "検針で「漏水の可能性」と言われたら。地面の下の水道管の漏れている場所を探して直し、水道局への書類づくりもお手伝いします。",
      photo: { src: "/images/service-3.jpg", alt: "壁から出ている古い水道管" },
    },
  ],
  symptoms: [
    { icon: "droplet", title: "蛇口からポタポタ", description: "閉めても止まらない、根元から漏れる" },
    { icon: "waves", title: "トイレがつまった", description: "水が引かない、流すとあふれそう" },
    { icon: "home", title: "シンク下が濡れている", description: "収納の床が湿っている、カビくさい" },
    { icon: "flame", title: "給湯の配管から水漏れ", description: "お風呂や給湯器のまわりが濡れている" },
    { icon: "gauge", title: "「漏水の可能性」の通知", description: "検針票に書かれていた、水道代が急に上がった" },
    { icon: "wrench", title: "古い蛇口が直らない", description: "部品が見つからない、交換しかないと言われた" },
  ],
  strengths: [
    { icon: "clock", title: "連絡したら、すぐ見に来る", description: "お電話をいただいたその日に伺えることもあります。留守番電話にお名前とご用件を残していただければ、折り返しお電話します。" },
    { icon: "yen", title: "作業の前に、金額をご説明", description: "見てから直し方と金額をお伝えし、ご了承をいただいてから作業します。無理に交換はすすめません。" },
    { icon: "file", title: "水道局の手続きまで", description: "漏水の修理のあとは、水道料金の減額に必要な書類の作成と提出もお手伝いします。" },
  ],
  reviews: {
    rating: "5.0",
    count: 18,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=%E4%BE%9D%E7%94%B0%E8%A8%AD%E5%82%99&query_place_id=ChIJO1fPFCpFGGARiRZY_jfcshs",
    points: [
      { icon: "clock", title: "電話したその日に来てくれた", description: "朝にトイレのつまりに気づいて電話したら、その日のうちに来てもらえた、という声があります。" },
      { icon: "yen", title: "作業の前に金額を説明してくれる", description: "直す前に金額の提示があり、納得できる値段だった、という声があります。" },
      { icon: "wrench", title: "古い部品も探して直してくれる", description: "交換しかないと思っていた古い蛇口を、合う部品を見つけて直してもらえた、という声があります。" },
      { icon: "file", title: "水道局の書類まで任せられた", description: "地中の漏水を見つけて直し、水道料金の減額の書類まで出してもらえた、という声があります。" },
    ],
  },
  selfCheck: {
    title: "水道代が急に上がったら",
    lead: "見えないところで水が漏れているかもしれません。ご自分で確かめる方法があります。",
    steps: [
      { title: "家じゅうの蛇口を閉める", description: "キッチン、洗面、お風呂、トイレ、外の水栓も。洗濯機や食洗機も止めます。" },
      { title: "水道メーターを見る", description: "メーターボックスのふたを開け、銀色の小さなコマ（パイロット）を見ます。" },
      { title: "コマが回っていたら漏水", description: "水を使っていないのに回っていれば、どこかで漏れています。お電話ください。" },
    ],
    note: "漏水を直したあとは、条件を満たせば水道料金が減額されることがあります。届け出の書類づくりもお手伝いします。",
  },
  area: {
    title: "金沢区とその周辺に伺います",
    places: ["釜利谷", "能見台", "金沢文庫", "金沢八景", "六浦", "富岡", "並木", "西柴", "谷津町", "泥亀", "瀬戸", "大道", "朝比奈町", "幸浦", "柴町", "堀口"],
    note: "上記以外の地域も、まずはお電話でご相談ください。",
  },
  flow: [
    { title: "お電話", description: "どこから、どんなふうに水が漏れているかをお聞かせください。" },
    { title: "現地の確認", description: "伺って状態を見て、直し方と費用をご説明します。" },
    { title: "修理", description: "ご了承をいただいてから作業します。" },
    { title: "書類のお手伝い", description: "漏水のときは、水道局への届け出もお手伝いします。" },
  ],
  faq: [
    { q: "日曜日も来てもらえますか？", a: "日曜日も17時まで受け付けています。平日と土曜日は20時までです。" },
    { q: "費用はいつわかりますか？", a: "伺って状態を見てから、直し方と金額をご説明します。ご了承をいただいてから作業しますので、ご安心ください。" },
    { q: "電話がつながらないときは？", a: "作業中で出られないことがあります。留守番電話にお名前とご用件を残していただければ、折り返しお電話します。" },
    { q: "古い蛇口でも直せますか？", a: "合う部品を探して直せる場合があります。まずは型番や写真を見せてください。" },
    { q: "どのあたりまで来てもらえますか？", a: "横浜市金沢区とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#2f6f9f",
    primaryDark: "#173a55",
    soft: "#eef4f8",
    accent: "#4c97c9",
  },
  site: {
    url: "https://yoda-setsubi.sonnet.co.jp",
    description:
      "横浜市金沢区の水道屋、依田設備。キッチンの水漏れ、トイレのつまり、給湯配管、地中の漏水まで。お電話をいただいたらすぐに伺います。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
