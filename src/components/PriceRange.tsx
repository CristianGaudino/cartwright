"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/stock/format";
import { PRICE_STEP as STEP, PRICE_TOP as TOP } from "@/lib/stock/types";

// A draggable price range: two thumbs on one track (two native range inputs, so keys, screen readers and touch all work). The ends mean no
// limit, so the value passed out is undefined there. `onCommit` runs when a thumb is let go, not on every pixel of the drag, so a list
// that refetches is asked once. `maxOnly` is one thumb, for a budget.
export function PriceRange({ label, min, max, onCommit, maxOnly = false }: { label?: string; min?: number; max?: number; onCommit(min: number | undefined, max: number | undefined): void; maxOnly?: boolean }) {
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [lo, hi] = drag ?? [maxOnly ? 0 : Math.min(min ?? 0, TOP), Math.min(max ?? TOP, TOP)];
  const commit = () => {
    if (!drag) return;
    setDrag(null);
    onCommit(drag[0] === 0 ? undefined : drag[0], drag[1] >= TOP ? undefined : drag[1]);
  };
  const constrained = lo > 0 || hi < TOP;
  const value = !constrained ? (maxOnly ? "Any budget" : "Any price") : lo === 0 ? `Up to ${formatPrice(hi)}` : hi >= TOP ? `${formatPrice(lo)} and over` : `${formatPrice(lo)} to ${formatPrice(hi)}`;
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
      data-single={maxOnly ? "" : undefined}
      className="price-range"
    />
  );
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {/* The name on the left, what is chosen on the right: the same rows as the drop-downs beside it. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-meta font-semibold">{label}</span>
        <span aria-live="polite" className="text-meta tabular-nums text-text-2">
          {value}
        </span>
      </div>
      {/* A well the height of a field, so it sits level with the controls beside it. */}
      <div className="relative h-12 rounded-control border border-control bg-surface">
        <div aria-hidden="true" className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hairline">
          <div className={`absolute inset-y-0 rounded-full ${constrained ? "bg-accent" : "bg-text-2/50"}`} style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        </div>
        {!maxOnly && input("lo")}
        {input("hi")}
      </div>
    </div>
  );
}
