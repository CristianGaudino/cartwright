import type { Metadata } from "next";
import Link from "next/link";
import { accentButton, pageMain } from "@/components/ui";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <main className={pageMain}>
      <h1 className="text-display font-semibold">We Couldn&apos;t Find That Page</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">The link may be old or mistyped.</p>
      <Link
        href="/used-cars"
        className={`mt-6 inline-flex items-center ${accentButton}`}
      >
        See All Used Cars
      </Link>
    </main>
  );
}
