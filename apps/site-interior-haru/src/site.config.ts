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

// ---- インテリアHARU（埼玉県草加市）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間）とクチコミの内容だけを元にしている。
// 代表者名・創業年・資格など確認できていない事実は書かない。

export const site: SiteConfig = {
  company: {
    name: "インテリアHARU",
    shortName: "インテリアHARU",
    industry: "壁紙（クロス）の張り替え",
    extraRows: [
      { label: "対応エリア", value: "草加市とその周辺" },
      { label: "Googleマップの評価", value: "★5.0（クチコミ25件・2026年10月時点）" },
    ],
  },
  contact: {
    phone: "080-2678-1344",
    postalCode: "340-0025",
    address: "埼玉県草加市谷塚仲町364-13",
    hours: "毎日 8:00〜19:00",
  },
  hero: {
    catchcopy: "汚れた壁紙が、\n見違えるほどきれいに。",
    lead: "草加市の壁紙張り替え専門店です。古い壁紙をていねいに剥がすところから、職人がひとりで責任を持って仕上げます。一部屋だけ、洗面所だけの張り替えもご相談ください。",
    photo: { src: "/images/hero.svg", alt: "壁紙を張り替えた部屋" },
  },
  about: {
    title: "相談から仕上げまで、同じ職人が伺います",
    body: "インテリアHARUは、草加市を拠点に壁紙の張り替えをしている職人の店です。お見積もりの相談から当日の作業、仕上がったあとのご連絡まで、同じ職人が担当します。お留守のあいだの作業や、ご家族の予定に合わせた日程など、ご都合をお聞かせください。",
    photo: { src: "/images/about.svg", alt: "張り替え中の壁と脚立" },
  },
  services: [
    {
      title: "お部屋の壁紙張り替え",
      description: "リビング・玄関・廊下・寝室など。手垢や日焼けで汚れた壁紙、地震で入ったひび割れも、古い壁紙をていねいに剥がしてから張り替えます。",
    },
    {
      title: "洗面所・水まわりの内装",
      description: "洗面所のクロスとフロアタイルをまとめて張り替えられます。設備工事のあとで天井や壁の状態がよくない場合もご相談ください。",
    },
    {
      title: "部分補修・アクセントクロス",
      description: "壁紙の傷や穴の補修、一面だけ柄を変えるアクセントクロスなど、小さな工事もお受けします。",
    },
  ],
  strengths: [
    { title: "見積もりの相談だけでも", description: "お見積もりのご相談だけでもどうぞ。他社と比べてからのご依頼でもかまいません。" },
    { title: "ひとりの職人が最後まで", description: "ご相談を受けた職人が、そのまま作業に伺います。" },
    { title: "日程の融通がききます", description: "帰省や来客の予定に合わせた日程や、お留守中の作業もご相談ください。" },
  ],
  theme: {
    primary: "#a0693c",
    primaryDark: "#6e4524",
    soft: "#f8f3ec",
  },
  site: {
    url: "https://site-interior-haru.ichigoooo.workers.dev",
    description:
      "埼玉県草加市の壁紙張り替え専門店、インテリアHARU。お部屋や洗面所のクロス張り替え、傷や穴の補修まで、職人がひとりで責任を持って仕上げます。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
