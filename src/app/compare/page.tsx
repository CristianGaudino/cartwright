import type { Metadata } from "next";
import { CompareTable } from "@/components/compare/CompareTable";
import { slash } from "@/components/ui";

// Each visitor's own list: never indexed and not in the sitemap.
export const metadata: Metadata = { title: "Compare cars", robots: { index: false } };

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={`text-display font-semibold lg:text-hero ${slash}`}>Compare cars</h1>
      <p className="mt-2 max-w-[65ch] text-body">Compare up to three cars side by side.</p>
      <div className="mt-6 min-h-[28rem]">
        <CompareTable />
      </div>
    </main>
  );
}
