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
  /** SNS。省くとセクションごと消える */
  sns?: {
    /** Instagram のユーザー名（@なし）。Instagram のプロフィール埋め込みで最新の投稿が自動で並ぶ */
    instagram?: string;
    /** YouTube。url が無ければ「近日公開」として出す */
    youtube?: { url?: string; title?: string; body: string[] };
  };
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

// ---- 株式会社アサカ建装（東京都稲城市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "株式会社アサカ建装",
    shortName: "アサカ建装",
    industry: "屋根・外壁の塗装",
    extraRows: [{ label: "対応エリア", value: "稲城市とその周辺" }],
  },
  contact: {
    phone: "042-377-1010",
    postalCode: "206-0812",
    address: "東京都稲城市矢野口542-15",
    hours: "毎日 9:00〜18:30",
  },
  hero: {
    catchcopy: "下請けに出さない。\nだから、\n何年たってもきれい。",
    lead: "稲城市矢野口の塗装会社です。屋根と外壁の塗装を、下請けに任せず自社の職人が仕上げます。元大工の社長が、家のつくりから見てご提案します。",
    photo: { src: "/images/hero.jpg", alt: "木と石を使った二階建ての住まいの外観", position: "60% 45%" },
    badges: ["自社施工", "元大工の社長が現地調査", "工事のあとも点検"],
  },
  stats: [
    { label: "Googleマップの評価", value: "4.8", unit: "／5" },
    { label: "クチコミ", value: "11", unit: "件" },
    { label: "営業日", value: "毎日", unit: "" },
  ],
  about: {
    title: "何のために塗るのかから、ご説明します。",
    body: [
      "アサカ建装は、稲城市矢野口の塗装会社です。屋根と外壁の塗装を、下請けに出さずに自社で施工しています。",
      "現場調査では、建物の傷みだけでなく、暮らし方やご要望も細かく伺います。社長は元大工なので、家のつくりを踏まえて、言われなければ気づかないところまでご提案します。",
      "次の塗り替えのことまで考えて、塗料や防水を選びます。",
    ],
    photo: { src: "/images/about.jpg", alt: "屋根の上で作業する職人" },
  },
  services: [
    {
      title: "屋根の塗装",
      description: "屋根の亀裂やひび割れを見つけたら、まず応急処置をしてから、塗装の計画を立てます。",
      photo: { src: "/images/service-1.jpg", alt: "軒先の屋根で作業する職人" },
    },
    {
      title: "外壁の塗装",
      description: "シーリングは年々へこむので厚めに打ち直すなど、見えないところまでていねいに仕上げます。",
      photo: { src: "/images/service-2.jpg", alt: "外壁の前で作業する職人" },
    },
    {
      title: "外まわりの細かな手入れ",
      description: "エアコン配管のカバーの交換など、塗装のついでに直しておきたいところもご提案します。",
      photo: { src: "/images/service-3.jpg", alt: "はしごの掛かった瓦屋根" },
    },
  ],
  strengths: [
    { title: "自社の職人が施工", description: "下請けに任せないので、仕上がりに責任を持てます。周りの家と比べても、艶が長持ちします。" },
    { title: "元大工の目で見る", description: "家のつくりを知っているから、塗装だけでなく傷みの原因まで見てご提案します。" },
    { title: "準備からていねいに", description: "足場を組む前のブルーシート張りから、仕事のていねいさを見ていただけます。" },
  ],
  flow: [
    { title: "お電話", description: "気になっている箇所をお聞かせください。" },
    { title: "現場調査", description: "建物を細かく見て、暮らし方やご要望を伺います。" },
    { title: "お見積もり・ご説明", description: "何のために塗るのかを含めて、分かりやすくご説明します。" },
    { title: "施工・アフター", description: "自社の職人が施工し、工事のあとも点検に伺います。" },
  ],
  faq: [
    { q: "下請けの業者が来ることはありますか？", a: "ありません。自社の職人が施工します。" },
    { q: "屋根にひびがあるのですが、すぐ来てもらえますか？", a: "まずご連絡ください。状態によっては応急処置をしてから、工事の計画を立てます。" },
    { q: "どのあたりまで来てもらえますか？", a: "稲城市とその周辺です。それ以外の地域もご相談ください。" },
  ],
  sns: {
    instagram: "asakakensou",
    // 文面は先方の YouTube 開始告知（Instagram の投稿）から
    youtube: {
      title: "塗装業者選びで、\n後悔しないために。",
      body: [
        "見積り、塗料、資格、施工方法、そして業者選び。塗装工事は、分からないことが多すぎます。",
        "ネットにはたくさんの情報があるけれど、答えは現場にあります。実際に現場に立つ塗装屋だからこそ、伝えられることがあります。",
        "塗装業界のこと、現場のこと、そして業者を選ぶときに本当に見てほしいことを、ひとつずつお話ししていきます。",
      ],
    },
  },
  theme: {
    primary: "#2d5d8a",
    primaryDark: "#163049",
    soft: "#eef3f8",
    accent: "#c9a04a",
  },
  site: {
    url: "https://asaka-kenso.sonnet.co.jp",
    description:
      "稲城市矢野口の塗装会社、アサカ建装。屋根・外壁の塗装を下請けに出さず自社で施工。元大工の社長が、家のつくりから見てご提案します。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
