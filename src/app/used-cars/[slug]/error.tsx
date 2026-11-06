"use client";

import { useParams } from "next/navigation";

// Covers car pages and the landing pages under this segment. It never changes a 404 or 410 status.
// Nothing is logged: the error and the URL are request data.
export default function SegmentError({ retry }: { error: unknown; retry: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const isCar = /-\d+$/.test(slug);
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <div className="py-16 text-center">
        <h1 className="text-heading font-semibold">{isCar ? "We could not load this car" : "We could not load the cars"}</h1>
        <p className="mt-2 text-body text-text-2">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-flex h-12 items-center rounded-control bg-accent px-6 font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100"
        >
          {isCar ? "Try loading the car again" : "Try loading cars again"}
        </button>
      </div>
    </main>
  );
}
