import type { Metadata } from "next";
import { SavedCars } from "@/components/saved/SavedCars";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Saved cars", robots: { index: false } };

export default function SavedPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">Saved Cars</h1>
      <div className="mt-6 min-h-[28rem]">
        <SavedCars />
      </div>
    </main>
  );
}
