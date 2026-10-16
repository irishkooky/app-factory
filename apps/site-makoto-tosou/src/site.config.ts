/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 別の会社のサイトを作るときは、このファイルと public/images/ の写真だけを差し替える。
 * 項目の意味は SiteConfig の型コメントを参照。省略可能（?）な項目は、省くとセクションごと消える。
 */

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
  strengths: { title: string; description: string; photo?: Photo }[];
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

// ---- まこと塗装（神奈川県藤沢市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "まこと塗装",
    shortName: "まこと塗装",
    industry: "外壁・屋根の塗装",
    extraRows: [{ label: "対応エリア", value: "藤沢市とその周辺" }],
  },
  contact: {
    phone: "090-2328-1749",
    postalCode: "251-0028",
    address: "神奈川県藤沢市本鵠沼5丁目2-3",
    hours: "平日 8:30〜18:00／土 8:30〜12:00",
    holidays: "日曜",
  },
  hero: {
    catchcopy: "細かい所まで、\n新築のように\nきれいに。",
    lead: "藤沢市本鵠沼の塗装屋です。外壁と屋根の塗り替えから、気になる一部分だけの塗装まで。色選びは、試し塗りで実際の色を見てから決められます。",
    photo: { src: "/images/hero.jpg", alt: "瓦屋根の日本の住宅", position: "center 55%" },
    badges: ["試し塗りで色を確認", "部分塗装も", "工事のあとも対応"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "13", unit: "件" },
    { label: "拠点", value: "藤沢", unit: "市本鵠沼" },
  ],
  about: {
    title: "知り合いに紹介したくなる塗装を。",
    body: [
      "まこと塗装は、藤沢市本鵠沼の塗装屋です。外壁のひび割れ、色あせた屋根。築年数がたったお住まいを、細かい所までていねいに塗り直します。",
      "色は、ご希望を伺ったうえで提案し、試し塗りで実際の見え方を確かめてから決めていただけます。思い切った色の変更も、安心してご相談ください。",
      "塗り終わったあとも、気になることがあればご連絡ください。",
    ],
    photo: { src: "/images/about.jpg", alt: "はしごに上って壁を塗り直す職人" },
  },
  services: [
    {
      title: "外壁の塗り替え",
      description: "ひび割れや色あせが気になる外壁を、下地を整えてから塗り直します。色の提案と試し塗りもお任せください。",
      photo: { src: "/images/service-1.jpg", alt: "住宅の外壁を塗装する職人" },
    },
    {
      title: "屋根の塗装",
      description: "外壁とあわせて屋根も塗り替えると、足場が一度で済みます。屋根の状態を見て、必要な塗装をご提案します。",
      photo: { src: "/images/service-2.jpg", alt: "屋根の上で作業する職人" },
    },
    {
      title: "部分塗装",
      description: "気になる一部分だけの塗装もお受けします。小さなご依頼もお気軽にどうぞ。",
      photo: { src: "/images/service-3.jpg", alt: "ローラーで壁を塗る手元" },
    },
  ],
  strengths: [
    { title: "試し塗りで色を決める", description: "小さな見本では分かりにくい色も、試し塗りで実際の見え方を確かめられます。" },
    { title: "細かい所までていねいに", description: "目立たない所こそていねいに。紹介でご依頼いただくことの多い塗装屋です。" },
    { title: "塗ったあとも", description: "工事のあとに気になることがあれば、ご連絡ください。アフターサービスも行っています。" },
  ],
  flow: [
    { title: "お電話", description: "塗りたい場所と、気になっていることをお聞かせください。" },
    { title: "現地の確認", description: "建物の状態を見て、塗装の内容とお見積もりをご説明します。" },
    { title: "色決め・試し塗り", description: "色を提案し、試し塗りで確かめてから決めます。" },
    { title: "塗装", description: "下地を整えてから、ていねいに塗り上げます。" },
  ],
  faq: [
    { q: "一部分だけの塗装でもお願いできますか？", a: "はい。部分塗装もお受けしています。" },
    { q: "色を大きく変えても大丈夫ですか？", a: "試し塗りで実際の色を見てから決められるので、ご安心ください。" },
    { q: "どのあたりまで来てもらえますか？", a: "藤沢市とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#2f7a78",
    primaryDark: "#174342",
    soft: "#eef6f5",
    accent: "#c48a3a",
  },
  site: {
    url: "https://site-makoto-tosou.ichigoooo.workers.dev",
    description:
      "藤沢市本鵠沼の塗装屋、まこと塗装。外壁・屋根の塗り替えから部分塗装まで。試し塗りで色を確かめてから、細かい所までていねいに仕上げます。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
