"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/stock/icons";
import { showToast } from "@/components/toast";
import { restoreSaved, toggleSaved, useSavedIds } from "@/lib/saved/store";

const looks = {
  // Over a photo: a frosted scrim circle, solid ink when the buyer asks for less transparency.
  card: "absolute right-2 top-2 z-20 rounded-full bg-ink/60 backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none",
  page: "rounded-full hover:bg-card",
};

// The label never changes; aria-pressed carries the state.
export function SaveButton({ id, label, variant }: { id: string; label: string; variant: "card" | "page" }) {
  const ids = useSavedIds();
  const saved = ids.includes(id);
  const [said, setSaid] = useState("");
  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={label}
        onClick={(e) => {
          // A sibling of the card's links, but stop anything above it from treating the tap as a card tap.
          e.preventDefault();
          e.stopPropagation();
          const result = toggleSaved(id);
          // A removal is announced by its toast, which has the Undo.
          if (result === "removed") showToast("Removed from saved", () => restoreSaved([id]));
          setSaid(result === "saved" ? "Saved" : result === "removed" ? "" : "Your saved list is full. Remove a car to save another.");
        }}
        className={`inline-flex size-11 items-center justify-center text-text transition-transform duration-100 ease-out active:scale-[0.97] motion-reduce:active:scale-100 ${looks[variant]}`}
      >
        <HeartIcon filled={saved} />
      </button>
      <span aria-live="polite" className="sr-only">
        {said}
      </span>
    </>
  );
}
