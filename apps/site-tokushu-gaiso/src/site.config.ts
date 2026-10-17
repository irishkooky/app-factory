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

// ---- 特殊外装（埼玉県川口市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "特殊外装",
    shortName: "特殊外装",
    industry: "無足場（ロープアクセス）の外壁塗装・防水",
    extraRows: [{ label: "工法", value: "ロープアクセス（無足場工法）" }],
  },
  contact: {
    phone: "090-6489-0989",
    postalCode: "334-0056",
    address: "埼玉県川口市峯463-5",
    hours: "毎日 7:00〜21:00",
  },
  hero: {
    catchcopy: "足場を組まずに、\n外壁を\nきれいに。",
    lead: "川口市の特殊外装は、ロープで高所に降りて作業する無足場工法の外装屋です。足場の費用をかけずに、外壁の塗装や防水、補修をお受けしています。",
    photo: { src: "/images/hero.jpg", alt: "ロープで建物の外壁に降りて作業する職人", position: "center center" },
    badges: ["足場の費用を抑えられる", "狭い場所も", "毎日 7時〜21時"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "14", unit: "件" },
    { label: "足場", value: "0", unit: "で施工" },
  ],
  about: {
    title: "足場が要らないから、費用も圧迫感も少なく。",
    body: [
      "外壁の工事は、まず足場を組むのが一般的です。特殊外装は、屋上からロープで降りて作業するロープアクセスで、足場を組まずに塗装や防水を行います。",
      "足場が組めない狭い場所や、テナントの営業を止めたくない建物でもご相談ください。作業の前に、安全対策と手順をきちんとご説明します。",
    ],
    photo: { src: "/images/about.jpg", alt: "ロープにぶら下がって作業する職人" },
  },
  services: [
    {
      title: "外壁の塗装",
      description: "足場を組まずに、ロープで外壁を塗り替えます。他社で足場が必要と言われた建物も、一度ご相談ください。",
      photo: { src: "/images/service-1.jpg", alt: "ロープで高層の外壁を塗装する様子" },
    },
    {
      title: "屋上・ベランダの防水",
      description: "屋上やベランダの防水工事、タイル面の防水もお受けしています。",
      photo: { src: "/images/service-2.jpg", alt: "屋上で防水シートを張る作業" },
    },
    {
      title: "外壁の点検・補修",
      description: "足場の組めない場所の補修や、高い所の点検も。気になるところを、ロープで近くまで降りて確かめます。",
      photo: { src: "/images/service-3.jpg", alt: "レンガの外壁で作業するロープアクセスの職人" },
    },
  ],
  strengths: [
    { title: "足場の費用がかからない", description: "足場を組まないので、その分の費用と日数を抑えられます。工事中の圧迫感もありません。" },
    { title: "安全管理を徹底", description: "高所作業だからこそ、安全対策と作業の手順を事前にご説明してから始めます。" },
    { title: "営業中の建物でも", description: "お店やテナントの営業に差し支えないよう、作業の時間を調整します。" },
  ],
  flow: [
    { title: "お電話", description: "建物の場所と、気になっている箇所をお聞かせください。" },
    { title: "現地の確認", description: "ロープで作業できるかを確かめ、手順とお見積もりをご説明します。" },
    { title: "施工", description: "足場を組まずに、ロープで降りて作業します。" },
    { title: "仕上がりの確認", description: "仕上がりを一緒に確かめていただきます。" },
  ],
  faq: [
    { q: "ロープでの作業は安全ですか？", a: "作業の前に安全対策と手順をご説明しています。不安なことは何でもお聞きください。" },
    { q: "お店を営業したまま工事できますか？", a: "営業に差し支えないよう、作業の時間を調整します。" },
    { q: "戸建ての家でも頼めますか？", a: "ご相談ください。建物の形を見て、ロープで作業できるかを確かめます。" },
  ],
  theme: {
    primary: "#3d5a73",
    primaryDark: "#1e2f3d",
    soft: "#eef2f5",
    accent: "#d08a2e",
  },
  site: {
    url: "https://tokushu-gaiso.sonnet.co.jp",
    description:
      "埼玉県川口市の特殊外装。ロープアクセス（無足場工法）で、足場を組まずに外壁塗装・屋上防水・補修を行います。足場の費用を抑えたい方に。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
