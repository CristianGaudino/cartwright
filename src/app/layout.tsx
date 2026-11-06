import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME, SITE_URL, indexable } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Quality used cars in Tralee, Co. Kerry.",
  // Site-wide default that every page inherits.
  robots: { index: indexable() },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
