import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartwright",
  description: "Quality used cars in Tralee, Co. Kerry.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body>{children}</body>
    </html>
  );
}
