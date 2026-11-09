"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/stock/format";
import { PRICE_STOPS } from "@/lib/stock/types";

const LAST = PRICE_STOPS.length - 1;
// The stop nearest a price (a link may carry one that is not a stop).
const at = (price: number | undefined, fallback: number) => (price === undefined ? fallback : PRICE_STOPS.reduce((best, s, i) => (Math.abs(s - price) < Math.abs(PRICE_STOPS[best] - price) ? i : best), 0));

// A price range: two thumbs on one track, with what is chosen written above it. The track steps through PRICE_STOPS, not evenly through euros,
// so the prices most cars sit at get most of the length (a straight scale to 100,000 left everything under 25,000 in a few pixels). The ends mean
// no limit, so undefined goes out there. Two native range inputs, so keys, screen readers and touch all work. `onCommit` runs when a thumb is let
// go, not on every pixel of the drag, so a list that refetches is asked once. `maxOnly` is one thumb, for a budget.
export function PriceRange({ label, min, max, onCommit, maxOnly = false }: { label?: string; min?: number; max?: number; onCommit(min: number | undefined, max: number | undefined): void; maxOnly?: boolean }) {
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [lo, hi] = drag ?? [maxOnly ? 0 : at(min, 0), at(max, LAST)];
  const commit = () => {
    if (!drag) return;
    setDrag(null);
    onCommit(drag[0] === 0 ? undefined : PRICE_STOPS[drag[0]], drag[1] >= LAST ? undefined : PRICE_STOPS[drag[1]]);
  };
  const constrained = lo > 0 || hi < LAST;
  const [from, to] = [formatPrice(PRICE_STOPS[lo]), formatPrice(PRICE_STOPS[hi])];
  const value = !constrained ? (maxOnly ? "Any budget" : "Any price") : lo === 0 ? `Up to ${to}` : hi >= LAST ? `${from} and over` : `${from} to ${to}`;
  const pct = (i: number) => `${(i / LAST) * 100}%`;
  const input = (which: "lo" | "hi") => (
    <input
      type="range"
      min={0}
      max={LAST}
      step={1}
      value={which === "lo" ? lo : hi}
      aria-label={maxOnly ? "Budget" : which === "lo" ? "Minimum price" : "Maximum price"}
      aria-valuetext={which === "lo" ? (lo === 0 ? "No minimum" : from) : hi >= LAST ? "No maximum" : to}
      onChange={(e) => {
        const v = Number(e.target.value);
        setDrag(which === "lo" ? [Math.min(v, hi - 1), hi] : [lo, Math.max(v, lo + 1)]);
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
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-meta font-semibold">{label}</span>
        <span aria-live="polite" className={`text-meta font-semibold tabular-nums ${constrained ? "text-text" : "text-text-2"}`}>
          {value}
        </span>
      </div>
      {/* The height of a field, so it sits level with the controls beside it. The bar is inset by half a thumb so the ends line up with it. */}
      <div className="relative h-12">
        <div aria-hidden="true" className="absolute inset-x-3.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-hairline">
          <div className={`absolute inset-y-0 rounded-full ${constrained ? "bg-accent" : "bg-text-2/40"}`} style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        </div>
        {!maxOnly && input("lo")}
        {input("hi")}
      </div>
    </div>
  );
}
