/**
 * 1社分のサイトの中身はすべてこのファイルにある。
 * 別の会社のサイトを作るときは、このファイルと public/images/ の写真だけを差し替える。
 * 項目の意味は SiteConfig の型コメントを参照。
 */

export type Photo = {
  /** public/ からのパス（例: /images/hero.jpg） */
  src: string;
  alt: string;
};

export type SiteConfig = {
  company: {
    /** 正式な会社名（例: 有限会社 森田工務店） */
    name: string;
    /** ヘッダーなどで使う短い呼び名（例: 森田工務店） */
    shortName: string;
    /** 業種（例: 工務店・リフォーム）。ヒーローの上の小見出しと title に出る */
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
  };
  about: {
    title: string;
    body: string;
    photo?: Photo;
  };
  services: { title: string; description: string; photo?: Photo }[];
  strengths: { title: string; description: string }[];
  /** 施工事例・メニュー・店内など。不要なら省略するとセクションとナビから消える */
  gallery?: { title: string; photos: Photo[] };
  theme: {
    /** メインカラー（ボタン・見出しのアクセント） */
    primary: string;
    /** メインカラーの濃い版（文字・ホバー） */
    primaryDark: string;
    /** セクション背景に敷く淡い色 */
    soft: string;
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
      { label: "従業員数", value: "8名（大工 5名）" },
      { label: "資格・許可", value: "一級建築士 / 二級建築施工管理技士 / 建設業許可" },
      { label: "対応エリア", value: "さいたま市・川口市・戸田市とその周辺" },
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
    catchcopy: "地元で35年。\n住まいの「困った」に\nすぐ駆けつけます。",
    lead: "雨漏りや水まわりの修理から、キッチン・お風呂のリフォーム、新築まで。自社の大工が最初から最後まで責任を持って仕上げます。",
    photo: { src: "/images/hero.svg", alt: "施工した住宅の外観" },
  },
  about: {
    title: "顔の見える工務店です",
    body: "森田工務店は、さいたま市南区で1987年から家づくりを続けてきました。ご相談をいただいたら、代表の森田が自分で現地を見に伺います。下請けに丸投げはせず、自社の大工が工事をして、終わったあとの点検まで同じ顔ぶれでお付き合いします。",
    photo: { src: "/images/about.svg", alt: "代表と大工のスタッフ" },
  },
  services: [
    {
      title: "修理・メンテナンス",
      description: "雨漏り、建具の不具合、外壁のひび割れなど。小さな工事でもお気軽にご相談ください。",
      photo: { src: "/images/service-1.svg", alt: "屋根の修理" },
    },
    {
      title: "水まわりリフォーム",
      description: "キッチン、浴室、トイレ、洗面台の交換。最短1日で工事が終わるプランもあります。",
      photo: { src: "/images/service-2.svg", alt: "リフォームしたキッチン" },
    },
    {
      title: "新築・増改築",
      description: "木の家の新築、二世帯への増築、間取りの変更まで。設計からご一緒します。",
      photo: { src: "/images/service-3.svg", alt: "新築の木造住宅" },
    },
  ],
  strengths: [
    { title: "見積もりは無料", description: "現地を見てから、工事の内訳がわかる見積書をお出しします。" },
    { title: "自社の大工が施工", description: "丸投げをしないので、品質と責任の所在がはっきりしています。" },
    { title: "工事後も点検に伺います", description: "引き渡しのあとも、1年・5年の点検で住まいを見守ります。" },
  ],
  gallery: {
    title: "施工事例",
    photos: [
      { src: "/images/gallery-1.svg", alt: "施工事例 1" },
      { src: "/images/gallery-2.svg", alt: "施工事例 2" },
      { src: "/images/gallery-3.svg", alt: "施工事例 3" },
      { src: "/images/gallery-4.svg", alt: "施工事例 4" },
    ],
  },
  theme: {
    primary: "#3f6b4a",
    primaryDark: "#26402c",
    soft: "#f3f6f1",
  },
  site: {
    url: "https://site-template.ichigoooo.workers.dev",
    description:
      "さいたま市南区の森田工務店。雨漏りや水まわりの修理、リフォーム、新築まで、自社の大工が責任を持って施工します。見積もり無料。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
