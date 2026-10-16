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

// ---- 庭事よりしろ（東京都杉並区）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "庭事よりしろ",
    shortName: "庭事よりしろ",
    industry: "庭木の剪定・伐採",
    extraRows: [{ label: "対応エリア", value: "杉並区とその周辺" }],
  },
  contact: {
    phone: "050-6863-1683",
    postalCode: "167-0032",
    address: "東京都杉並区天沼3丁目6-12",
    hours: "8:30〜17:00",
    holidays: "日曜",
  },
  hero: {
    catchcopy: "一本一本の木に、\nちょうどいい\n手入れを。",
    lead: "杉並区天沼の植木屋です。伸びすぎた庭木の剪定、枯れた木の伐採、草取りまで。畳半畳ほどの植栽でも、よろこんで伺います。",
    photo: { src: "/images/hero.jpg", alt: "緑に囲まれた日本家屋と庭木", position: "center 60%" },
    badges: ["小さな庭も歓迎", "見積もりの相談だけでも", "メッセージでも連絡OK"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "16", unit: "件" },
    { label: "拠点", value: "杉並", unit: "区天沼" },
  ],
  about: {
    title: "木の状態を見て、切り方を決めます。",
    body: [
      "庭事よりしろは、杉並区天沼を拠点にしている植木屋です。刈り込み、透かし、切り詰め。同じ剪定でも、木の種類や伸び方、お庭での役割に合わせて切り方を変えています。",
      "目隠しの木は目隠しのまま風通しよく、落ち葉に困っている木は小さく。ご要望を伺ったうえで、専門家としての判断もお伝えします。",
      "ご近所の植木屋なので、来年もその次も、同じ手で手入れを続けられます。",
    ],
    photo: { src: "/images/about.jpg", alt: "剪定ばさみで枝を整える手元" },
  },
  services: [
    {
      title: "庭木の剪定",
      description: "伸び放題になった木、目隠しの生垣、玄関まわりの植栽。刈り込みや透かしで、すっきりと風通しよく整えます。",
      photo: { src: "/images/service-1.jpg", alt: "剪定ばさみで枝を切る様子" },
    },
    {
      title: "伐採・枯れ木の処理",
      description: "枯れてしまった木や、大きくなりすぎた木の伐採もお受けします。残す木の剪定とあわせてご相談ください。",
      photo: { src: "/images/service-2.jpg", alt: "高枝切りで木の枝を落とす作業" },
    },
    {
      title: "草取り・雑草の対策",
      description: "伸びた雑草の手作業での草取りや、除草剤を使いにくいお宅での雑草対策もご相談ください。",
      photo: { src: "/images/service-3.jpg", alt: "刈り込みばさみで生垣を整える様子" },
    },
  ],
  strengths: [
    { title: "連絡にはすぐお返事", description: "お問い合わせをいただいたら、すぐに様子を見に伺います。メッセージでのやりとりもできます。" },
    { title: "小さなお庭もよろこんで", description: "畳半畳ほどの植栽や、木が1本だけのお庭でも、遠慮なくお声がけください。" },
    { title: "毎年の手入れを続けて", description: "一度きりではなく、毎年の剪定をお任せいただいているお宅もあります。" },
  ],
  flow: [
    { title: "お問い合わせ", description: "お電話かメッセージで、木の様子やお困りごとをお聞かせください。" },
    { title: "現地の確認", description: "お庭を見て、切り方とお見積もりをご説明します。" },
    { title: "剪定・伐採", description: "ご要望と木の状態を合わせて、ていねいに仕上げます。" },
    { title: "次の手入れ", description: "次の季節や来年の手入れの時期もお伝えします。" },
  ],
  faq: [
    { q: "木が1本だけでもお願いできますか？", a: "はい。小さなスペースの植栽や木が1本だけのお庭でも伺います。" },
    { q: "相見積もりでもかまいませんか？", a: "かまいません。お見積もりのご相談だけでもどうぞ。" },
    { q: "どのあたりまで来てもらえますか？", a: "杉並区とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#4a7a3d",
    primaryDark: "#263f1f",
    soft: "#f2f5ec",
    accent: "#8a9a4a",
  },
  site: {
    url: "https://site-niwagoto-yorishiro.ichigoooo.workers.dev",
    description:
      "杉並区天沼の植木屋、庭事よりしろ。庭木の剪定・伐採・草取りまで、一本一本の木の状態に合わせてていねいに手入れします。小さなお庭も歓迎です。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
