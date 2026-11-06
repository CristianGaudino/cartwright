"use client";

import { useId, useState } from "react";
import { facetRows, toggle } from "@/lib/stock/query";
import type { FacetOption } from "@/lib/stock/types";
import { useStock } from "./StockShell";

const COLLAPSED = 8;
const legend = "text-body font-semibold";
const link = "min-h-11 self-start text-body font-semibold underline active:scale-[0.97] motion-reduce:active:scale-100";

// Make and Model: a checkbox list with counts. Collapsed it shows the top 8 plus every ticked row, so a ticked row never hides (BRW-01).
function CheckGroup({ title, group, options }: { title: string; group: "make" | "model"; options: FacetOption[] }) {
  const { query, summary, facets, navigate } = useStock();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = query[group];
  const rows = facetRows(options, selected, summary !== null);
  const shown = open ? rows : rows.filter((r, i) => i < COLLAPSED || selected.includes(r.value));

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={`${legend} mb-1`}>{title}</legend>
      <div id={listId} data-testid="facet-list" className={open ? "max-h-[320px] overflow-y-auto" : undefined}>
        {shown.map((row) => (
          <label key={row.value} className={`flex min-h-11 items-center gap-3 ${row.disabled ? "text-text-2" : ""}`}>
            <input
              type="checkbox"
              value={row.value}
              checked={selected.includes(row.value)}
              aria-disabled={row.disabled || undefined}
              onChange={() => !row.disabled && navigate(toggle(query, group, row.value, facets))}
              className="h-5 w-5 shrink-0 accent-accent"
            />
            <span className="min-w-0 flex-1 truncate">{row.label}</span>
            {row.count !== undefined && (
              <span data-testid="facet-count" className="shrink-0 text-meta text-text-2">
                {row.count}
              </span>
            )}
          </label>
        ))}
      </div>
      {open && rows.length > COLLAPSED ? (
        <button type="button" aria-controls={listId} aria-expanded onClick={() => setOpen(false)} className={link}>
          Show fewer
        </button>
      ) : (
        shown.length < rows.length && (
          <button type="button" aria-controls={listId} aria-expanded={false} onClick={() => setOpen(true)} className={link}>
            Show all {rows.length}
          </button>
        )
      )}
    </fieldset>
  );
}

export function StockFilters() {
  const { facets } = useStock();
  return (
    <div className="flex flex-col gap-6">
      <CheckGroup title="Make" group="make" options={facets?.make ?? []} />
    </div>
  );
}
