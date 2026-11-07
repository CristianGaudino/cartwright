"use client";

import { useState } from "react";
import { SwapIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";
import { toggleCompare, useCompareIds } from "@/lib/compare/store";

// On the car page only: the cards carry just the heart, so a photo is not buried in buttons.
// The label never changes; aria-pressed carries the state, as with the heart.
export function CompareButton({ id, label }: { id: string; label: string }) {
  const on = useCompareIds().includes(id);
  const [said, setSaid] = useState("");
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={() => {
          const result = toggleCompare(id);
          setSaid(result === "added" ? "Added to compare" : result === "removed" ? "Removed from compare" : "You can compare up to three cars. Remove one to add another.");
        }}
        className={`inline-flex h-11 items-center gap-2 px-4 text-body text-text ${secondaryButton} ${on ? "ring-2 ring-accent" : ""}`}
      >
        <SwapIcon className="size-6" />
        Compare
      </button>
      <span aria-live="polite" className="sr-only">
        {said}
      </span>
    </>
  );
}
