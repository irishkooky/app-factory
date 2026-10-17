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

// ---- 有限会社内田工務店（埼玉県所沢市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "有限会社 内田工務店",
    shortName: "内田工務店",
    industry: "住まいのリフォーム・修理",
    extraRows: [{ label: "対応エリア", value: "所沢市とその周辺" }],
  },
  contact: {
    phone: "04-2997-8613",
    postalCode: "359-0045",
    address: "埼玉県所沢市美原町1丁目2907-2-105",
    hours: "毎日 8:00〜20:00（日・月は19:00まで）",
  },
  hero: {
    catchcopy: "見積もりどおりの\n金額で、\n頼んだとおりに。",
    lead: "新所沢の工務店です。壁塗り、外壁と屋根の塗装、雨漏りの修理、トイレの修理まで。住まいの困りごとを、できる範囲でまとめてお引き受けします。",
    photo: { src: "/images/hero.jpg", alt: "桜の木のある住宅", position: "center center" },
    badges: ["追加料金なし", "雨漏りの急ぎも", "小さな修理もついでに"],
  },
  stats: [
    { label: "Googleマップの評価", value: "4.6", unit: "／5" },
    { label: "クチコミ", value: "14", unit: "件" },
    { label: "営業日", value: "毎日", unit: "" },
  ],
  about: {
    title: "地元で頼りにされる工務店でいたい。",
    body: [
      "内田工務店は、所沢市美原町の工務店です。新所沢で長く、家の修理とリフォームをお受けしてきました。",
      "お話をしっかり伺い、ご依頼どおりに仕上げます。お見積もりのあとに金額を上乗せすることはありません。",
      "外壁の工事のついでにトイレの修理を、といったご相談もお気軽にどうぞ。",
    ],
    photo: { src: "/images/about.jpg", alt: "鉋で木材を削る大工の手元" },
  },
  services: [
    {
      title: "壁塗り・内装のリフォーム",
      description: "壁の塗り替えやお部屋のリフォーム。ていねいな施工で、ご希望どおりに仕上げます。",
      photo: { src: "/images/service-1.jpg", alt: "室内の壁を仕上げる職人" },
    },
    {
      title: "外壁・屋根の塗装と雨漏り",
      description: "雨漏りの急ぎのご相談から、外壁と屋根の塗装まで。お見積もりどおりの金額で工事します。",
      photo: { src: "/images/service-2.jpg", alt: "屋根の上で作業する職人" },
    },
    {
      title: "トイレなどの修理",
      description: "トイレや水まわりの修理など、住まいの小さな困りごともご相談ください。",
      photo: { src: "/images/service-3.jpg", alt: "流し台の蛇口" },
    },
  ],
  strengths: [
    { title: "追加料金がかからない", description: "お見積もりの金額で工事します。あとから上乗せすることはありません。" },
    { title: "話をしっかり聞く", description: "ご希望を真剣に伺い、お願いされたとおりの仕上がりを目指します。" },
    { title: "まとめて相談できる", description: "塗装のついでにトイレの修理など、できる範囲でまとめてお引き受けします。" },
  ],
  flow: [
    { title: "お電話", description: "お困りのことをそのままお聞かせください。" },
    { title: "現地の確認", description: "伺って状態を見て、工事の内容をご説明します。" },
    { title: "お見積もり", description: "見積もりの金額のまま工事します。" },
    { title: "工事", description: "ていねいに仕上げ、ご確認いただきます。" },
  ],
  faq: [
    { q: "見積もりのあとで金額が増えることはありますか？", a: "ありません。お見積もりどおりの金額で工事します。" },
    { q: "雨漏りで急いでいるのですが。", a: "まずお電話ください。できるだけ早く伺います。" },
    { q: "どのあたりまで来てもらえますか？", a: "所沢市とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#8a5a2b",
    primaryDark: "#4a2f16",
    soft: "#f7f2ea",
    accent: "#6f8a3c",
  },
  site: {
    url: "https://uchida-koumuten.sonnet.co.jp",
    description:
      "所沢市美原町の内田工務店。壁塗り、外壁・屋根の塗装、雨漏りやトイレの修理まで。お見積もりどおりの金額で、ご依頼どおりに仕上げます。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
