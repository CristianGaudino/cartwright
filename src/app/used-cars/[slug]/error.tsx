"use client";

import { useParams } from "next/navigation";
import { accentButton, pageMain } from "@/components/ui";

// Covers car pages and the landing pages under this segment. It never changes a 404 or 410 status.
// Nothing is logged: the error and the URL are request data.
export default function SegmentError({ retry }: { error: unknown; retry: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const isCar = /-\d+$/.test(slug);
  return (
    <main className={pageMain}>
      <div className="py-16 text-center">
        <h1 className="text-heading font-semibold">{isCar ? "We couldn't load this car" : "We couldn't load the cars"}</h1>
        <p className="mt-2 text-body text-text-2">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className={`mt-6 inline-flex items-center ${accentButton}`}
        >
          {isCar ? "Try loading the car again" : "Try loading cars again"}
        </button>
      </div>
    </main>
  );
}
