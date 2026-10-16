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

// ---- ROBUST（神奈川県川崎市宮前区）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "ROBUST",
    shortName: "ROBUST",
    industry: "内装リフォーム",
    extraRows: [{ label: "対応エリア", value: "川崎市宮前区とその周辺" }],
  },
  contact: {
    phone: "090-4537-4339",
    postalCode: "216-0044",
    address: "神奈川県川崎市宮前区西野川3丁目21-21",
    hours: "9:00〜18:00",
    holidays: "日曜",
  },
  hero: {
    catchcopy: "壁紙も、床も、\n水まわりも。\nまとめて職人に。",
    lead: "川崎市宮前区の内装リフォームの職人集団です。壁紙と床の張り替え、トイレや洗面所の内装から、マンション全体のリフォーム、お店の退去工事まで。",
    photo: { src: "/images/hero.jpg", alt: "リフォームを終えた明るい部屋", position: "center center" },
    badges: ["一部屋から全面まで", "進み具合を写真でご報告", "店舗の退去工事も"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "11", unit: "件" },
    { label: "拠点", value: "宮前", unit: "区" },
  ],
  about: {
    title: "やりたいことを、そのままかたちに。",
    body: [
      "ROBUSTは、川崎市宮前区を拠点にした内装リフォームの職人集団です。壁紙、床、水まわり、塗装、クリーニングまで、内装のことをまとめてお受けしています。",
      "お客様が一番やりたいことをよく調べ、確認してから工事に入ります。こちらの得意な工事に誘導するのではなく、ご希望に合った方法をご提案します。",
      "工事中は、進み具合を写真つきでこまめにご報告します。",
    ],
    photo: { src: "/images/about.jpg", alt: "壁の下地を整える職人" },
  },
  services: [
    {
      title: "壁紙・床の張り替え",
      description: "全部屋の壁紙や絨毯の張り替え、フローリング、クッションフロアまで。お部屋の印象がまるごと変わります。",
      photo: { src: "/images/service-1.jpg", alt: "フローリングを張る職人の手元" },
    },
    {
      title: "トイレ・洗面・浴室の内装",
      description: "トイレや洗面所のクッションフロア、浴室の内装、可動棚の取り付けなど、水まわりの内装もお任せください。",
      photo: { src: "/images/service-2.jpg", alt: "洗面台のある洗面所" },
    },
    {
      title: "マンションの全面リフォーム・店舗の退去工事",
      description: "マンション全体のリフォームや、お店の退去にともなう塗装・床工事・クリーニング・廃棄物の処理まで、まとめてお受けします。",
      photo: { src: "/images/service-3.jpg", alt: "工事中の部屋と脚立" },
    },
  ],
  strengths: [
    { title: "まとめて頼める", description: "壁紙、床、水まわり、クリーニング。複数の業者に分けずに、ひとつの窓口で進められます。" },
    { title: "写真つきでこまめにご報告", description: "工事の進み具合を写真でお送りするので、現場に行けなくても安心です。" },
    { title: "仕上がったあとも", description: "工事のあとに「ここが気になる」があれば、遠慮なくお知らせください。" },
  ],
  flow: [
    { title: "ご相談", description: "やりたいことと、お困りのことをお聞かせください。" },
    { title: "現地の確認・お見積もり", description: "現場を見て、工事の内容とお見積もりをお出しします。" },
    { title: "工事", description: "進み具合は写真つきでご報告します。" },
    { title: "お引き渡し", description: "仕上がりを一緒に確かめ、気になる所は直します。" },
  ],
  faq: [
    { q: "トイレの床だけでもお願いできますか？", a: "はい。クッションフロアの張り替えなど、小さな工事からお受けしています。" },
    { q: "お店の退去工事も頼めますか？", a: "塗装、床工事、クリーニング、廃棄物の処理までまとめてお受けします。" },
    { q: "相見積もりでもかまいませんか？", a: "かまいません。お見積もりのご相談だけでもどうぞ。" },
  ],
  theme: {
    primary: "#4f5d75",
    primaryDark: "#262d3a",
    soft: "#f3f3f6",
    accent: "#b08d57",
  },
  site: {
    url: "https://site-robust.ichigoooo.workers.dev",
    description:
      "川崎市宮前区の内装リフォーム、ROBUST。壁紙・床の張り替え、トイレや洗面の内装、マンションの全面リフォーム、店舗の退去工事までまとめてお受けします。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
