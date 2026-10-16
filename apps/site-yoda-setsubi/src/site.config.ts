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

// ---- 依田設備（神奈川県横浜市金沢区）への提案用 ----
// 文面は Google マップの公開情報（住所・電話・営業時間・評価）とクチコミに書かれた事実だけを元にしている。
// 代表者名・創業年・資格・料金など確認できていないことは書かない。
// 写真は Pexels のフリー素材（public/images/CREDITS.md）。お客様の声はご本人の了承がないので載せない。

export const site: SiteConfig = {
  company: {
    name: "依田設備",
    shortName: "依田設備",
    industry: "水まわりの修理・水道設備",
    extraRows: [{ label: "対応エリア", value: "横浜市金沢区とその周辺" }],
  },
  contact: {
    phone: "090-1551-7518",
    postalCode: "236-0046",
    address: "神奈川県横浜市金沢区釜利谷西1丁目59-12",
    hours: "月〜土 8:00〜20:00／日 8:00〜17:00",
  },
  hero: {
    catchcopy: "水のトラブル、\nその日のうちに\n伺います。",
    lead: "横浜市金沢区の水道屋です。キッチンの水漏れ、トイレのつまり、給湯の配管まで。お電話をいただいたら、できるだけ早く見に伺います。",
    photo: { src: "/images/hero.jpg", alt: "流し台の下で配管を締め直す手元", position: "center center" },
    badges: ["日曜も受付", "小さな水漏れも", "古い部品もご相談を"],
  },
  stats: [
    { label: "Googleマップの評価", value: "5.0", unit: "／5" },
    { label: "クチコミ", value: "18", unit: "件" },
    { label: "受付", value: "毎日", unit: "" },
  ],
  about: {
    title: "困ったときに、すぐ来てくれる水道屋に。",
    body: [
      "依田設備は、横浜市金沢区で水まわりの修理をしている設備屋です。蛇口の交換やトイレのつまりから、地面の下の水道管の漏水まで、ご家庭の水のトラブルをお受けしています。",
      "まず状態をよく見て、必要な工事だけをご提案します。古い型の蛇口や部品も、合うものを探して直せる場合があります。",
      "漏水の修理のあとは、水道局への届け出の書類もお手伝いします。",
    ],
    photo: { src: "/images/about.jpg", alt: "工具を持って作業する設備屋の手元" },
  },
  services: [
    {
      title: "キッチン・洗面の水漏れ",
      description: "蛇口からのポタポタ、シンク下の水漏れ、蛇口ごとの交換。部品だけで直せるものは部品の交換で直します。",
      photo: { src: "/images/service-1.jpg", alt: "キッチンの流し台と蛇口" },
    },
    {
      title: "トイレのつまり・給湯の配管",
      description: "トイレや排水のつまり、浴室の給湯管からの水漏れなど。お電話の内容によっては、当日に伺えます。",
      photo: { src: "/images/service-2.jpg", alt: "配管をつなぐ作業の手元" },
    },
    {
      title: "漏水の調査と修理",
      description: "検針で「漏水の可能性」と言われたら。地面の下の水道管の漏れている場所を探して直し、水道局への書類づくりもお手伝いします。",
      photo: { src: "/images/service-3.jpg", alt: "壁から出ている古い水道管" },
    },
  ],
  strengths: [
    { title: "連絡したら、すぐ見に来る", description: "お電話をいただいたその日に伺えることもあります。水のトラブルは待てないので、できるだけ早く動きます。" },
    { title: "必要な工事だけを", description: "無理に交換をすすめず、お客様の立場で一番よい直し方を考えます。" },
    { title: "水道局の手続きまで", description: "漏水の修理のあとは、水道料金の減額に必要な書類の作成と提出もお手伝いします。" },
  ],
  flow: [
    { title: "お電話", description: "どこから、どんなふうに水が漏れているかをお聞かせください。" },
    { title: "現地の確認", description: "伺って状態を見て、直し方と費用をご説明します。" },
    { title: "修理", description: "ご了承をいただいてから作業します。" },
    { title: "書類のお手伝い", description: "漏水のときは、水道局への届け出もお手伝いします。" },
  ],
  faq: [
    { q: "日曜日も来てもらえますか？", a: "日曜日も17時まで受け付けています。平日と土曜日は20時までです。" },
    { q: "古い蛇口でも直せますか？", a: "合う部品を探して直せる場合があります。まずは型番や写真を見せてください。" },
    { q: "どのあたりまで来てもらえますか？", a: "横浜市金沢区とその周辺です。それ以外の地域もご相談ください。" },
  ],
  theme: {
    primary: "#2f6f9f",
    primaryDark: "#173a55",
    soft: "#eef4f8",
    accent: "#4c97c9",
  },
  site: {
    url: "https://site-yoda-setsubi.ichigoooo.workers.dev",
    description:
      "横浜市金沢区の水道屋、依田設備。キッチンの水漏れ、トイレのつまり、給湯配管、地中の漏水まで。お電話をいただいたらすぐに伺います。",
    isProposal: true,
    proposedBy: "合同会社ソネット",
  },
};
