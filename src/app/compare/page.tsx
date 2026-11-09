import type { Metadata } from "next";
import { CompareCards } from "@/components/compare/CompareCards";
import { pageMain, pageTitle } from "@/components/ui";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Compare Cars", robots: { index: false } };

export default function ComparePage() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>Compare Cars</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">Compare up to three cars side by side.</p>
      <div className="mt-6 min-h-[28rem]">
        <CompareCards />
      </div>
    </main>
  );
}
