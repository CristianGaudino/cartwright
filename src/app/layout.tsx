import type { Metadata } from "next";
import { CompareBar } from "@/components/compare/CompareBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, indexable } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Quality used cars in Tralee, Co. Kerry.",
  // Each page names itself as canonical, so a link with tracking parameters still counts for the page. Pages with their own override this.
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IE", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image" },
  // Site-wide default that every page inherits.
  robots: { index: indexable() },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <CompareBar />
      </body>
    </html>
  );
}
