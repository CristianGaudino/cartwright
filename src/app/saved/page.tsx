import type { Metadata } from "next";
import { SavedCars } from "@/components/saved/SavedCars";
import { pageMain, pageTitle } from "@/components/ui";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Saved Cars", robots: { index: false } };

export default function SavedPage() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>Saved Cars</h1>
      <div className="mt-6 min-h-[28rem]">
        <SavedCars />
      </div>
    </main>
  );
}
