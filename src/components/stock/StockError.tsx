"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StateBlock } from "@/components/StateBlock";
import { accentButton } from "@/components/ui";

// Its own module so /saved can show it without loading the filter UI that lives in StockShell.
export const stateButton = `mt-6 inline-flex items-center ${accentButton}`;

// retry: what Try again does when the cars came from the browser (/saved) rather than the server render.
export function StockError({ retry }: { retry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <StateBlock title="We couldn't load the cars" text="Check your connection and try again.">
      <button type="button" disabled={pending} onClick={() => (retry ? retry() : startTransition(() => router.refresh()))} className={stateButton}>
        Try Loading Cars Again
      </button>
    </StateBlock>
  );
}
