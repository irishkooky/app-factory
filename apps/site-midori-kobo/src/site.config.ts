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

// ---- みどり工房（東京都立川市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "みどり工房",
    shortName: "みどり工房",
    industry: "外壁・屋根の塗装",
    extraRows: [{ label: "対応エリア", value: "立川市とその周辺" }],
  },
  contact: {
    phone: "042-502-9324",
    postalCode: "190-0034",
    address: "東京都立川市西砂町5丁目3-1",
    hours: "8:00〜18:00",
    holidays: "土日",
  },
  hero: {
    catchcopy: "要らない工事は、\n要らないと\nお伝えします。",
    lead: "立川市西砂町の塗装屋です。外壁と屋根の塗装、シーリングの打ち直しまで。家の状態を見て、今やるべきことと、まだやらなくていいことを正直にご説明します。",
    photo: { src: "/images/hero.jpg", alt: "花に囲まれた二階建ての住宅", position: "center 40%" },
    badges: ["説明がていねい", "限られたご予算でも", "ご近所への気配りも"],
  },
  stats: [
    { label: "Googleマップの評価", value: "4.9", unit: "／5" },
    { label: "クチコミ", value: "10", unit: "件" },
    { label: "拠点", value: "立川", unit: "市西砂町" },
  ],
  about: {
    title: "相見積もりで、選ばれる理由。",
    body: [
      "みどり工房は、立川市西砂町の塗装屋です。外壁や屋根の塗装を、職人が自分の目で家を見て、ていねいにご説明するところから始めます。",
      "見積もりでは、必要のない工事ははっきり「要りません」とお伝えします。限られたご予算の中で、何を優先すればよいかを一緒に考えます。",
      "工事中は、ご近所への配慮も欠かしません。",
    ],
    photo: { src: "/images/about.jpg", alt: "外壁を塗る職人" },
  },
  services: [
    {
      title: "外壁の塗装",
      description: "築20年、30年の戸建てや賃貸物件の外壁を、新築の頃を思い出すほどきれいに塗り直します。",
      photo: { src: "/images/service-1.jpg", alt: "高所作業車から外壁を塗る職人" },
    },
    {
      title: "屋根の塗装・補修",
      description: "スレートの割れなど、屋根の傷みを見て、塗装が必要かどうかからご説明します。",
      photo: { src: "/images/service-2.jpg", alt: "屋根の上で作業する職人" },
    },
    {
      title: "シーリングの打ち直し",
      description: "サイディングの継ぎ目のシーリングを打ち直します。外壁の塗装とあわせて行うのがおすすめです。",
      photo: { src: "/images/service-3.jpg", alt: "住宅の外まわりで作業する職人たち" },
    },
  ],
  strengths: [
    { title: "正直な見積もり", description: "不必要な工事はおすすめしません。今すぐ塗らなくていい場合は、そうお伝えします。" },
    { title: "ていねいな説明", description: "作業の前に、何をなぜするのかを分かりやすくご説明します。ご要望にも細かくお応えします。" },
    { title: "ご近所への配慮", description: "工事のあいだ、近隣の方へのご挨拶や気配りも大切にしています。" },
  ],
  flow: [
    { title: "お電話", description: "気になっている箇所や、築年数をお聞かせください。" },
    { title: "現地の確認", description: "屋根や外壁の状態を見て、今やるべきことをご説明します。" },
    { title: "お見積もり", description: "ご予算に合わせて、工事の内容を一緒に決めます。" },
    { title: "塗装", description: "ていねいに塗り上げ、仕上がりを一緒に確かめます。" },
  ],
  faq: [
    { q: "見積もりだけでもいいですか？", a: "はい。家の状態を見て、今は塗らなくてよい場合もそうお伝えします。" },
    { q: "賃貸物件でも頼めますか？", a: "はい。賃貸物件の屋根と外壁の塗装もお受けしています。" },
    { q: "どのあたりまで来てもらえますか？", a: "立川市とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#3f7d5a",
    primaryDark: "#1f4230",
    soft: "#f0f6f1",
    accent: "#a08a4a",
  },
  site: {
    url: "https://site-midori-kobo.ichigoooo.workers.dev",
    description:
      "立川市西砂町の塗装屋、みどり工房。外壁・屋根の塗装とシーリングの打ち直し。不必要な工事はおすすめせず、ていねいな説明から始めます。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
