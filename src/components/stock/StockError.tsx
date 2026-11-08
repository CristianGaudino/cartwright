"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { accentButton, subTitle } from "@/components/ui";

// Its own module so /saved can show it without loading the filter UI that lives in StockShell.
export const stateButton = `mt-6 inline-flex items-center ${accentButton}`;

// retry: what Try again does when the cars came from the browser (/saved) rather than the server render.
export function StockError({ retry }: { retry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="py-16 text-center">
      <h2 className={subTitle}>We could not load the cars</h2>
      <p className="mt-2 text-body text-text-2">Check your connection and try again.</p>
      <button type="button" disabled={pending} onClick={() => (retry ? retry() : startTransition(() => router.refresh()))} className={stateButton}>
        Try Loading Cars Again
      </button>
    </div>
  );
}
