"use client";

import { useState } from "react";
import { SwapIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";
import { toggleCompare, useCompareIds } from "@/lib/compare/store";

const looks = {
  // Under the heart on a card photo: the same frosted scrim circle.
  card: "absolute right-2 top-14 z-20 size-11 justify-center rounded-full bg-ink/60 backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none",
  page: `h-11 gap-2 px-4 text-body ${secondaryButton}`,
};

// The label never changes; aria-pressed carries the state, as with the heart.
export function CompareButton({ id, label, variant }: { id: string; label: string; variant: "card" | "page" }) {
  const on = useCompareIds().includes(id);
  const [said, setSaid] = useState("");
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const result = toggleCompare(id);
          setSaid(result === "added" ? "Added to compare" : result === "removed" ? "Removed from compare" : "You can compare up to three cars. Remove one to add another.");
        }}
        className={`inline-flex items-center text-text transition-transform duration-100 ease-out active:scale-[0.97] motion-reduce:active:scale-100 ${looks[variant]} ${on ? "ring-2 ring-accent" : ""}`}
      >
        <SwapIcon className="size-6" />
        {variant === "page" && "Compare"}
      </button>
      <span aria-live="polite" className="sr-only">
        {said}
      </span>
    </>
  );
}
