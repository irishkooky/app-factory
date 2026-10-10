import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { site } from "~/site.config";

import "./globals.css";

const title = `${site.company.name}｜${site.company.industry}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.site.url),
  title: {
    default: title,
    template: `%s | ${site.company.shortName}`,
  },
  description: site.site.description,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: site.site.url,
    siteName: site.company.name,
    title,
    description: site.site.description,
    images: [site.hero.photo.src],
  },
  alternates: { canonical: site.site.url },
  // 提案用サンプルは検索結果に出さない
  robots: site.site.isProposal ? { index: false, follow: false } : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeVars = {
    "--brand": site.theme.primary,
    "--brand-dark": site.theme.primaryDark,
    "--brand-soft": site.theme.soft,
  } as CSSProperties;

  return (
    <html lang="ja" style={themeVars}>
      <body>{children}</body>
    </html>
  );
}
