"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/stock/format";
import { PRICE_STEP as STEP, PRICE_TOP as TOP } from "@/lib/stock/types";

// A draggable price range: two thumbs on one track (two native range inputs, so keys, screen readers and touch all work). The ends mean no
// limit, so the value passed out is undefined there. `onCommit` runs when a thumb is let go, not on every pixel of the drag, so a list
// that refetches is asked once. `maxOnly` is one thumb, for a budget.
export function PriceRange({ min, max, onCommit, maxOnly = false }: { min?: number; max?: number; onCommit(min: number | undefined, max: number | undefined): void; maxOnly?: boolean }) {
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [lo, hi] = drag ?? [maxOnly ? 0 : Math.min(min ?? 0, TOP), Math.min(max ?? TOP, TOP)];
  const commit = () => {
    if (!drag) return;
    setDrag(null);
    onCommit(drag[0] === 0 ? undefined : drag[0], drag[1] >= TOP ? undefined : drag[1]);
  };
  const label = maxOnly ? (hi >= TOP ? "Any budget" : `Up to ${formatPrice(hi)}`) : `${lo === 0 ? "Any" : formatPrice(lo)} to ${hi >= TOP ? "any" : formatPrice(hi)}`;
  const pct = (v: number) => `${(v / TOP) * 100}%`;
  const input = (which: "lo" | "hi") => (
    <input
      type="range"
      min={0}
      max={TOP}
      step={STEP}
      value={which === "lo" ? lo : hi}
      aria-label={maxOnly ? "Budget" : which === "lo" ? "Minimum price" : "Maximum price"}
      aria-valuetext={which === "lo" ? (lo === 0 ? "No minimum" : formatPrice(lo)) : hi >= TOP ? "No maximum" : formatPrice(hi)}
      onChange={(e) => {
        const v = Number(e.target.value);
        setDrag(which === "lo" ? [Math.min(v, hi - STEP), hi] : [lo, Math.max(v, lo + STEP)]);
      }}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
      className="price-range"
    />
  );
  return (
    <div className="flex w-full flex-col gap-1">
      <p aria-live="polite" className="text-meta font-semibold tabular-nums">
        {label}
      </p>
      <div className="relative h-11">
        <div aria-hidden="true" className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hairline">
          <div className="absolute inset-y-0 rounded-full bg-accent" style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        </div>
        {!maxOnly && input("lo")}
        {input("hi")}
      </div>
    </div>
  );
}
