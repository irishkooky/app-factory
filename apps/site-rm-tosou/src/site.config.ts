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

// ---- 株式会社アール・エム塗装（神奈川県横浜市泉区）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "株式会社アール・エム塗装",
    shortName: "アール・エム塗装",
    industry: "屋根の葺き替え・外壁塗装",
    extraRows: [{ label: "対応エリア", value: "横浜市泉区とその周辺" }],
  },
  contact: {
    phone: "080-2017-4457",
    postalCode: "245-0003",
    address: "神奈川県横浜市泉区岡津町113-17",
    hours: "毎日 9:00〜17:00",
  },
  hero: {
    catchcopy: "自分の作品として、\n一軒一軒を\n塗り上げる。",
    lead: "横浜市泉区のアール・エム塗装です。屋根の葺き替え、外壁の塗装、屋上やベランダの防水まで。毎日の作業の様子を動画でお送りしています。",
    photo: { src: "/images/hero.jpg", alt: "住宅街の二階建ての家", position: "center 60%" },
    badges: ["作業の様子を毎日動画で", "近所へのご挨拶から", "色決めは施工例を見ながら"],
  },
  stats: [
    { label: "Googleマップの評価", value: "4.9", unit: "／5" },
    { label: "クチコミ", value: "10", unit: "件" },
    { label: "営業日", value: "毎日", unit: "" },
  ],
  about: {
    title: "塗り終わったあとも、自分の作品だから。",
    body: [
      "アール・エム塗装は、横浜市泉区の塗装会社です。屋根の葺き替えから外壁の塗装、防水まで、住まいの外まわりをまとめてお受けしています。",
      "色選びに迷ったら、実際に塗った現場をご案内します。工事中は毎日、作業の様子を動画でお送りするので、完成までの過程を見ていただけます。",
      "外壁沿いの配管の傷みなど、気づいたところは一緒に直してから塗装します。",
    ],
    photo: { src: "/images/about.jpg", alt: "屋根の上で作業する職人" },
  },
  services: [
    {
      title: "屋根の葺き替え",
      description: "傷んだ屋根を新しく葺き替えます。外壁の塗装と同時に行えば、足場が一度で済みます。",
      photo: { src: "/images/service-1.jpg", alt: "屋根瓦を張る職人" },
    },
    {
      title: "外壁の塗装",
      description: "下地や配管まわりの補修をしてから、細かい所までていねいに塗り上げます。ソーラーパネルの脱着が必要な工事もご相談ください。",
      photo: { src: "/images/service-2.jpg", alt: "はしごに上って外壁を塗る職人" },
    },
    {
      title: "屋上・ベランダの防水",
      description: "3階建ての屋上やベランダの防水工事もお受けしています。",
      photo: { src: "/images/service-3.jpg", alt: "屋上で防水シートを施工する様子" },
    },
  ],
  strengths: [
    { title: "毎日、動画でご報告", description: "その日の作業の様子を毎日お送りします。完成までの過程を見ていただけます。" },
    { title: "現場を見て色を決める", description: "色選びに迷ったら、実際に塗った現場をご案内します。" },
    { title: "何かあれば、すぐ駆けつけます", description: "工事のあとも、屋根のことで困ったときはご連絡ください。" },
  ],
  flow: [
    { title: "お電話", description: "気になっている箇所をお聞かせください。" },
    { title: "現地の確認・お見積もり", description: "屋根や外壁の状態を見て、内容と費用をご説明します。" },
    { title: "ご近所へのご挨拶", description: "工事の前に、ご近所へのご挨拶に伺います。" },
    { title: "施工", description: "毎日の作業の様子を動画でお送りします。" },
  ],
  faq: [
    { q: "屋根と外壁を一緒に頼めますか？", a: "はい。屋根の葺き替えと外壁の塗装を同時にお受けできます。" },
    { q: "ソーラーパネルがあっても塗装できますか？", a: "パネルの脱着が必要な工事もお受けしています。ご相談ください。" },
    { q: "どのあたりまで来てもらえますか？", a: "横浜市泉区とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#a1442f",
    primaryDark: "#55231a",
    soft: "#f9f1ee",
    accent: "#d0894c",
  },
  site: {
    url: "https://site-rm-tosou.ichigoooo.workers.dev",
    description:
      "横浜市泉区のアール・エム塗装。屋根の葺き替え、外壁塗装、屋上・ベランダの防水まで。工事中は毎日、作業の様子を動画でお送りします。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
