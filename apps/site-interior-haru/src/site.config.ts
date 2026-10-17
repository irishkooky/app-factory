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

// ---- インテリアHARU（埼玉県草加市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "インテリアHARU",
    shortName: "インテリアHARU",
    industry: "壁紙（クロス）の張り替え",
    extraRows: [{ label: "対応エリア", value: "草加市とその周辺" }],
  },
  contact: {
    phone: "080-2678-1344",
    postalCode: "340-0025",
    address: "埼玉県草加市谷塚仲町364-13",
    hours: "毎日 8:00〜19:00",
  },
  hero: {
    catchcopy: "汚れた壁紙が、\n見違えるほど\nきれいに。",
    lead: "草加市の壁紙張り替え専門店です。古い壁紙をていねいに剥がすところから、職人がひとりで責任を持って仕上げます。一部屋だけ、洗面所だけの張り替えもご相談ください。",
    photo: { src: "/images/hero.jpg", alt: "日の光が差し込む白い壁", position: "center center" },
    badges: ["お見積もりの相談だけでも", "一部屋から", "毎日 8時〜19時"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "25", unit: "件" },
    { label: "営業日", value: "毎日", unit: "" },
  ],
  about: {
    title: "相談から仕上げまで、同じ職人が伺います。",
    body: [
      "インテリアHARUは、草加市を拠点に壁紙の張り替えをしている職人の店です。お見積もりの相談から当日の作業、仕上がったあとのご連絡まで、同じ職人が担当します。",
      "お留守のあいだの作業や、ご家族の帰省・来客に合わせた日程など、ご都合をお聞かせください。",
    ],
    photo: { src: "/images/about.jpg", alt: "明るいリビング" },
  },
  services: [
    {
      title: "お部屋の壁紙張り替え",
      description: "リビング・玄関・廊下・寝室など。手垢や日焼けで汚れた壁紙、地震で入ったひび割れも、古い壁紙をていねいに剥がしてから張り替えます。",
      photo: { src: "/images/service-1.jpg", alt: "白い壁のリビング" },
    },
    {
      title: "洗面所・水まわりの内装",
      description: "洗面所のクロスとフロアタイルをまとめて張り替えられます。設備工事のあとで天井や壁の状態がよくない場合もご相談ください。",
      photo: { src: "/images/service-2.jpg", alt: "洗面台のある洗面所" },
    },
    {
      title: "部分補修・アクセントクロス",
      description: "壁紙の傷や穴の補修、一面だけ柄を変えるアクセントクロスなど、小さな工事もお受けします。",
      photo: { src: "/images/service-3.jpg", alt: "柄物の壁紙を張った廊下" },
    },
  ],
  strengths: [
    { title: "見積もりの相談だけでも", description: "お見積もりのご相談だけでもどうぞ。他社と比べてからのご依頼でもかまいません。" },
    { title: "ひとりの職人が最後まで", description: "ご相談を受けた職人が、そのまま作業に伺います。" },
    { title: "日程の融通がききます", description: "帰省や来客の予定に合わせた日程や、お留守中の作業もご相談ください。" },
  ],
  flow: [
    { title: "お電話", description: "張り替えたい場所と、気になっていることをお聞かせください。" },
    { title: "お見積もり", description: "お部屋を見て、費用をご案内します。" },
    { title: "日程の相談", description: "ご都合に合わせて作業日を決めます。" },
    { title: "張り替え", description: "古い壁紙を剥がしてから、新しい壁紙を張ります。" },
  ],
  faq: [
    { q: "一部屋だけでもお願いできますか？", a: "はい。一部屋だけ、洗面所だけの張り替えもお受けしています。" },
    { q: "留守中に作業してもらえますか？", a: "ご相談ください。お仕事などのご都合に合わせて伺います。" },
    { q: "どのあたりまで来てもらえますか？", a: "草加市とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#a0693c",
    primaryDark: "#5e3b1f",
    soft: "#f8f3ec",
    accent: "#c08a4f",
  },
  site: {
    url: "https://interior-haru.sonnet.co.jp",
    description:
      "埼玉県草加市の壁紙張り替え専門店、インテリアHARU。お部屋や洗面所のクロス張り替え、傷や穴の補修まで、職人がひとりで責任を持って仕上げます。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
