import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Carright", template: "%s | Carright" },
  description: "Quality used cars in Tralee, Co. Kerry.",
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
