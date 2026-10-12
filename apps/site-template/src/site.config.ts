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

// ---- ここから下がサンプル1社分（架空の会社） ----

export const site: SiteConfig = {
  company: {
    name: "有限会社 森田工務店",
    shortName: "森田工務店",
    industry: "工務店・住まいのリフォーム",
    representative: "代表取締役 森田 浩二",
    founded: "1987年",
    extraRows: [
      { label: "従業員数", value: "8名（うち自社大工 5名）" },
      { label: "資格・許可", value: "一級建築士 / 二級建築施工管理技士 / 埼玉県知事許可（般）" },
      { label: "対応エリア", value: "さいたま市・川口市・戸田市・蕨市とその周辺" },
    ],
  },
  contact: {
    phone: "048-000-0000",
    email: "info@example.com",
    postalCode: "336-0000",
    address: "埼玉県さいたま市南区〇〇1-2-3",
    hours: "8:00〜18:00",
    holidays: "日曜・祝日",
    mapQuery: "さいたま市南区役所",
  },
  hero: {
    catchcopy: "直すのも、建てるのも。\n地元の大工が\n最後まで。",
    lead: "雨漏りや水まわりの修理から、キッチン・浴室のリフォーム、木の家の新築まで。さいたま市南区で38年、自社の大工が責任を持って仕上げます。",
    photo: { src: "/images/hero.jpg", alt: "木と石を使った二階建ての住まいの外観", position: "60% 45%" },
    badges: ["お見積もり無料", "小さな修理も歓迎", "工事後の定期点検つき"],
  },
  stats: [
    { label: "創業", value: "38", unit: "年" },
    { label: "施工実績", value: "2,400", unit: "件以上" },
    { label: "自社の大工", value: "5", unit: "名" },
  ],
  about: {
    title: "ご相談には、代表の私が伺います。",
    body: [
      "森田工務店は、1987年にさいたま市南区で父が始めた小さな工務店です。いまも変わらず、ご相談をいただいたら代表の私が自分で現地を見に伺い、工事の中身と費用をご説明しています。",
      "工事は下請けに任せず、自社の大工が最初から最後まで担当します。だから、仕上がりに責任を持てますし、何年たっても「あのとき工事した家」として、同じ顔ぶれでお付き合いが続きます。",
      "ドアの建て付けひとつでも、遠慮なくお電話ください。",
    ],
    photo: { src: "/images/about.jpg", alt: "鉋（かんな）で木材を削る大工の手元", position: "45% center" },
    signature: "代表取締役 森田 浩二",
  },
  services: [
    {
      title: "修理・メンテナンス",
      description: "雨漏り、建具の不具合、外壁のひび割れ、床のきしみ。半日で終わる小さな工事でも、すぐに伺います。",
      photo: { src: "/images/service-1.jpg", alt: "屋根に上って点検・修理をする職人", position: "center 35%" },
      price: "1万円〜",
    },
    {
      title: "水まわりリフォーム",
      description: "キッチン、浴室、トイレ、洗面台の交換。住みながら工事ができ、トイレ交換なら1日で終わります。",
      photo: { src: "/images/service-2.jpg", alt: "リフォームしたキッチン" },
      price: "トイレ交換 15万円〜",
    },
    {
      title: "新築・増改築",
      description: "国産材を使った木の家の新築、二世帯への増築、間取りの変更。設計から一緒に考えます。",
      photo: { src: "/images/service-3.jpg", alt: "骨組みができた建築中の住宅" },
      price: "ご予算に合わせてご提案",
    },
  ],
  strengths: [
    {
      title: "見積もりは無料。内訳まで隠さずに。",
      description:
        "現地を見てから、材料と手間の内訳がわかる見積書をお出しします。「一式」でまとめず、何にいくらかかるかを一緒に確かめてから決めていただけます。",
      photo: { src: "/images/strength-1.jpg", alt: "間取りの図面を手に取って確認する様子" },
    },
    {
      title: "自社の大工が、最初から最後まで。",
      description:
        "工事を丸投げしないので、現場の判断が早く、仕上がりの責任もはっきりしています。現場で気づいたことは、その日のうちにご報告します。",
      photo: { src: "/images/strength-2.jpg", alt: "作業場で木材を削る大工" },
    },
    {
      title: "引き渡しのあとも、点検に伺います。",
      description:
        "1年・5年の無料点検で、住まいの小さな変化を見逃しません。「近くまで来たので」と顔を出せるのも、地元の工務店だからです。",
      photo: { src: "/images/strength-3.jpg", alt: "住宅街の格子戸の玄関" },
    },
  ],
  gallery: {
    title: "施工事例",
    items: [
      { src: "/images/works-1.jpg", alt: "板張りの外壁と縁側のある木の家", title: "縁側のある木の家の新築", meta: "さいたま市南区・工期5か月", position: "center 72%" },
      { src: "/images/works-2.jpg", alt: "キッチンのリフォーム", title: "明るいキッチンへの入れ替え", meta: "川口市・工期6日" },
      { src: "/images/works-3.jpg", alt: "リフォームした明るい浴室", title: "在来浴室からユニットバスへ", meta: "戸田市・工期4日", position: "center 60%" },
      { src: "/images/works-4.jpg", alt: "畳の小上がりがあるリビング", title: "畳の小上がりがあるリビング", meta: "さいたま市浦和区・工期3週間" },
      { src: "/images/works-5.jpg", alt: "床と壁を張り替えた洋室", title: "床と壁紙の張り替え", meta: "蕨市・工期3日" },
      { src: "/images/works-6.jpg", alt: "庭に面したウッドデッキ", title: "庭に面したウッドデッキ", meta: "さいたま市南区・工期3日" },
    ],
  },
  flow: [
    { title: "お電話・メール", description: "困っていることを、そのままお聞かせください。" },
    { title: "現地の確認", description: "代表が伺い、状態を見て、ご希望を伺います。" },
    { title: "お見積もり", description: "内訳つきの見積書をお持ちします。無料です。" },
    { title: "工事", description: "自社の大工が施工。ご近所へのご挨拶もします。" },
    { title: "点検・アフター", description: "1年・5年の点検。気になることはいつでも。" },
  ],
  voices: [
    {
      body: "雨漏りでお電話したら、その日の夕方に見に来てくれました。原因を写真で見せてもらえたので納得して頼めました。",
      name: "K様",
      meta: "さいたま市南区・屋根の修理",
    },
    {
      body: "母の家の浴室を、手すりの位置まで相談しながら決めてくれました。工事中も毎日声をかけてもらえて安心でした。",
      name: "S様",
      meta: "川口市・浴室リフォーム",
    },
    {
      body: "新築から10年、点検のたびに同じ大工さんが来てくれます。何かあってもここに電話すればいい、という安心感があります。",
      name: "T様",
      meta: "戸田市・新築",
    },
  ],
  faq: [
    {
      q: "見積もりだけでもお願いできますか？",
      a: "はい、無料です。見積もりのあとにお断りいただいても費用はかかりません。",
    },
    {
      q: "電球の交換や網戸の張り替えのような小さなことでも来てもらえますか？",
      a: "もちろんです。小さな工事こそ地元の工務店の仕事だと考えています。まずはお電話ください。",
    },
    {
      q: "どのあたりまで対応していますか？",
      a: "さいたま市・川口市・戸田市・蕨市とその周辺です。それ以外の地域もご相談ください。",
    },
    {
      q: "支払い方法は？",
      a: "現金・銀行振込に対応しています。大きな工事は、着工時と完成時の分割払いもできます。",
    },
  ],
  theme: {
    primary: "#35624a",
    primaryDark: "#1f3a2c",
    soft: "#f6f3ec",
    accent: "#a87b4f",
  },
  site: {
    url: "https://site-template.ichigoooo.workers.dev",
    description:
      "さいたま市南区の森田工務店。雨漏りや水まわりの修理、リフォーム、新築まで、自社の大工が責任を持って施工します。見積もり無料。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
