"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatKm, formatPrice } from "@/lib/stock/format";
import { facetRows, toggle, withRange } from "@/lib/stock/query";
import { BUDGETS, GEARBOX_LABELS, GEARBOXES } from "@/lib/stock/types";
import type { FacetOption, Gearbox, StockQuery } from "@/lib/stock/types";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { useStock } from "./StockShell";
import { press } from "@/components/ui";

const COLLAPSED = 8;
const legend = "text-body font-semibold";
const link = `min-h-11 self-start text-body font-semibold underline ${press}`;
const KMS = [20000, 50000, 80000, 100000, 150000];

// Make and Model: a checkbox list with counts. Collapsed it shows the top 8 plus every ticked row, so a ticked row never hides (BRW-01).
function CheckGroup({ title, group, options }: { title: string; group: "make" | "model"; options: FacetOption[] }) {
  const { query, summary, facets, navigate } = useStock();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = query[group];
  const rows = facetRows(options, selected, summary !== null);
  if (rows.length === 0) return null;
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

// Body type and Fuel: toggle chips. Selection shows a check as well as the fill, never colour alone.
function ChipGroup({ title, group, options }: { title: string; group: "body" | "fuel"; options: FacetOption[] }) {
  const { query, summary, facets, navigate } = useStock();
  const selected: string[] = query[group];
  const rows = facetRows(options, selected, summary !== null);
  if (rows.length === 0) return null;
  return (
    <fieldset className="min-w-0">
      <legend className={`${legend} mb-2`}>{title}</legend>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => {
          const on = selected.includes(row.value);
          return (
            <button
              key={row.value}
              type="button"
              aria-pressed={on}
              aria-disabled={row.disabled || undefined}
              onClick={() => !row.disabled && navigate(toggle(query, group, row.value, facets))}
              className={`inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border px-4 text-meta font-semibold ${press} ${
                on ? "border-accent bg-accent text-white" : `border-control bg-card ${row.disabled ? "text-text-2" : ""}`
              }`}
            >
              {on && <CheckIcon className="h-4 w-4 shrink-0" />}
              <span className="min-w-0 truncate">{row.label}</span>
              {row.count !== undefined && <span className="shrink-0 font-normal">{row.count}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: number | undefined; options: { value: number; label: string }[]; onChange: (v: number | undefined) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-meta font-semibold">
      {label}
      <span className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="h-12 w-full appearance-none rounded-control border border-control bg-card py-0 pl-3 pr-10 text-body font-normal"
        >
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-3 h-6 w-6" />
      </span>
    </label>
  );
}

// A hand-edited URL can hold a value that is not a step; keep it selectable so it shows and can be changed.
const withSelected = (values: number[], ...selected: (number | undefined)[]) =>
  [...new Set([...values, ...selected.filter((v): v is number => v !== undefined)])].sort((a, b) => a - b);

export function SearchBox() {
  const { query, navigate } = useStock();
  const queryRef = useRef(query);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [value, setValue] = useState(query.q ?? "");
  const [sent, setSent] = useState(query.q ?? "");
  const [seen, setSeen] = useState(query.q ?? "");
  useEffect(() => {
    queryRef.current = query;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  // Something else changed the search (Clear all filters, a chip): show it. Our own sends are ignored.
  const current = query.q ?? "";
  if (current !== seen) {
    setSeen(current);
    if (current !== sent) {
      setSent(current);
      setValue(current);
    }
  }

  return (
    <input
      type="search"
      aria-label="Search make or model"
      placeholder="Search make or model"
      maxLength={80}
      enterKeyHint="search"
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} // closes the phone keyboard; the debounced search still runs
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const q = next.trim();
          setSent(q);
          navigate({ ...queryRef.current, q: q || undefined, page: 1 });
        }, 250);
      }}
      className="h-12 w-full rounded-control border border-control bg-card px-3 text-body"
    />
  );
}

function Transmission() {
  const { query, navigate } = useStock();
  const name = useId();
  const options: { value: Gearbox | undefined; label: string }[] = [{ value: undefined, label: "Any" }, ...GEARBOXES.map((g) => ({ value: g, label: GEARBOX_LABELS[g] }))];
  return (
    <fieldset role="radiogroup" className="min-w-0">
      <legend className={`${legend} mb-2`}>Transmission</legend>
      <div className="grid grid-cols-3 overflow-hidden rounded-control border border-control">
        {options.map((o) => {
          const on = query.gearbox === o.value;
          return (
            <label key={o.label} className="relative flex">
              <input type="radio" name={name} value={o.value ?? ""} checked={on} onChange={() => navigate({ ...query, gearbox: o.value, page: 1 })} className="peer sr-only" />
              <span
                className={`flex min-h-11 w-full items-center justify-center gap-1 px-2 text-meta font-semibold peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 ${press} ${
                  on ? "bg-accent text-white" : "bg-card"
                }`}
              >
                {on && <CheckIcon className="h-4 w-4 shrink-0" />}
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className={`${legend} mb-2`}>{title}</legend>
      <div className="flex gap-3">{children}</div>
    </fieldset>
  );
}

export function StockFilters({ showSearch = true }: { showSearch?: boolean }) {
  const { query, facets, navigate } = useStock();
  const set = (patch: Partial<StockQuery>) => navigate(withRange(query, patch));
  const models = facets?.model.filter((o) => o.parent !== undefined && query.make.includes(o.parent)) ?? [];
  const years: number[] = [];
  if (facets?.years) for (let y = facets.years.max; y >= facets.years.min; y--) years.push(y);
  const yearOptions = withSelected(years, query.yearFrom, query.yearTo).reverse().map((y) => ({ value: y, label: String(y) }));

  return (
    <div className="flex flex-col gap-6">
      {showSearch && <SearchBox />}
      <CheckGroup title="Make" group="make" options={facets?.make ?? []} />
      {query.make.length > 0 && <CheckGroup title="Model" group="model" options={models} />}
      <Row title="Year">
        <SelectField label="From" value={query.yearFrom} options={yearOptions} onChange={(yearFrom) => set({ yearFrom })} />
        <SelectField label="To" value={query.yearTo} options={yearOptions} onChange={(yearTo) => set({ yearTo })} />
      </Row>
      <Row title="Budget">
        <SelectField label="Min" value={query.priceMin} options={withSelected(BUDGETS, query.priceMin).map((v) => ({ value: v, label: formatPrice(v) }))} onChange={(priceMin) => set({ priceMin })} />
        <SelectField label="Max" value={query.priceMax} options={withSelected(BUDGETS, query.priceMax).map((v) => ({ value: v, label: formatPrice(v) }))} onChange={(priceMax) => set({ priceMax })} />
      </Row>
      <ChipGroup title="Body type" group="body" options={facets?.body ?? []} />
      <ChipGroup title="Fuel" group="fuel" options={facets?.fuel ?? []} />
      <Transmission />
      <Row title="Mileage">
        <SelectField label="Up to" value={query.kmMax} options={withSelected(KMS, query.kmMax).map((v) => ({ value: v, label: formatKm(v) }))} onChange={(kmMax) => set({ kmMax })} />
      </Row>
      <label className="flex min-h-11 items-center gap-3 border-t border-hairline pt-4">
        <input
          type="checkbox"
          checked={query.sold === "include"}
          onChange={(e) => navigate({ ...query, sold: e.target.checked ? "include" : undefined, page: 1 })}
          className="h-5 w-5 shrink-0 accent-accent"
        />
        <span className="min-w-0 flex-1">Include sold cars</span>
      </label>
    </div>
  );
}
