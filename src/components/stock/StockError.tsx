"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Its own module so /saved can show it without loading the filter UI that lives in StockShell.
export const stateButton =
  "mt-6 inline-flex h-12 items-center rounded-control bg-accent px-6 font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100";

// retry: what Try again does when the cars came from the browser (/saved) rather than the server render.
export function StockError({ retry }: { retry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="py-16 text-center">
      <h2 className="text-heading font-semibold">We could not load the cars</h2>
      <p className="mt-2 text-body text-text-2">Check your connection and try again.</p>
      <button type="button" disabled={pending} onClick={() => (retry ? retry() : startTransition(() => router.refresh()))} className={stateButton}>
        Try loading cars again
      </button>
    </div>
  );
}
