"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatKm, formatPrice } from "@/lib/stock/format";
import { facetRows, toggle, withRange } from "@/lib/stock/query";
import { BUDGETS, GEARBOX_LABELS, GEARBOXES } from "@/lib/stock/types";
import type { FacetOption, Gearbox, StockQuery } from "@/lib/stock/types";
import { Combobox } from "@/components/Combobox";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { useStock } from "./StockShell";
import { press } from "@/components/ui";

const COLLAPSED = 8;
// One accordion row, as in the mockup: the title and a chevron, the options under it. It starts open when something in it is chosen,
// or for the group that asks to (Make), and the buyer opens and closes it after that. The options stay in the page when it is closed.
function Group({ title, active, defaultOpen = false, role, children }: { title: string; active: boolean; defaultOpen?: boolean; role?: "radiogroup"; children: React.ReactNode }) {
  const [open] = useState(active || defaultOpen); // only the starting state: later the row is the buyer's to open and close
  return (
    <details open={open} className="group min-w-0">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-body font-semibold [&::-webkit-details-marker]:hidden ${press}`}>
        {title}
        <ChevronDownIcon className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div role={role ?? "group"} aria-label={title} className="flex flex-col pt-1">
        {children}
      </div>
    </details>
  );
}
const link = `min-h-11 self-start text-body font-semibold underline ${press}`;
const KMS = [20000, 50000, 80000, 100000, 150000];

// Make and Model: a checkbox list with counts. Collapsed it shows the top 8 plus every ticked row, so a ticked row never hides (BRW-01).
function CheckGroup({ title, group, options, defaultOpen }: { title: string; group: "make" | "model"; options: FacetOption[]; defaultOpen?: boolean }) {
  const { query, summary, facets, navigate } = useStock();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = query[group];
  const rows = facetRows(options, selected, summary !== null);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.filter((r, i) => i < COLLAPSED || selected.includes(r.value));

  return (
    <Group title={title} active={selected.length > 0} defaultOpen={defaultOpen}>
      <div id={listId} data-testid="facet-list">
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
          Show Fewer
        </button>
      ) : (
        shown.length < rows.length && (
          <button type="button" aria-controls={listId} aria-expanded={false} onClick={() => setOpen(true)} className={link}>
            Show All {rows.length}
          </button>
        )
      )}
    </Group>
  );
}

// Body type and Fuel: toggle chips. Selection shows a check as well as the fill, never colour alone.
function ChipGroup({ title, group, options }: { title: string; group: "body" | "fuel"; options: FacetOption[] }) {
  const { query, summary, facets, navigate } = useStock();
  const selected: string[] = query[group];
  const rows = facetRows(options, selected, summary !== null);
  if (rows.length === 0) return null;
  return (
    <Group title={title} active={selected.length > 0}>
      <div className="flex flex-wrap gap-2 py-1">
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
    </Group>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: number | undefined; options: { value: number; label: string }[]; onChange: (v: number | undefined) => void }) {
  const id = useId();
  // A <label for>, not a wrapping label: the open list would otherwise become part of the label's name.
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-meta font-semibold">
        {label}
      </label>
      <Combobox
        id={id}
        value={value === undefined ? "" : String(value)}
        onChange={(v) => onChange(v ? Number(v) : undefined)}
        options={[{ value: "", label: "Any" }, ...options.map((o) => ({ value: String(o.value), label: o.label }))]}
        className="pl-3 font-normal"
      />
    </div>
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
    <Group title="Transmission" active={query.gearbox !== undefined} role="radiogroup">
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
    </Group>
  );
}

function Row({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <Group title={title} active={active}>
      <div className="flex gap-3 py-1">{children}</div>
    </Group>
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
    <div className="flex flex-col divide-y divide-hairline *:py-4 *:first:pt-0 *:last:pb-0">
      {showSearch && (
        <div>
          <SearchBox />
        </div>
      )}
      <CheckGroup title="Make" group="make" options={facets?.make ?? []} defaultOpen />
      {query.make.length > 0 && <CheckGroup title="Model" group="model" options={models} defaultOpen />}
      <Row title="Year" active={query.yearFrom !== undefined || query.yearTo !== undefined}>
        <SelectField label="From" value={query.yearFrom} options={yearOptions} onChange={(yearFrom) => set({ yearFrom })} />
        <SelectField label="To" value={query.yearTo} options={yearOptions} onChange={(yearTo) => set({ yearTo })} />
      </Row>
      <Row title="Budget" active={query.priceMin !== undefined || query.priceMax !== undefined}>
        <SelectField label="Min" value={query.priceMin} options={withSelected(BUDGETS, query.priceMin).map((v) => ({ value: v, label: formatPrice(v) }))} onChange={(priceMin) => set({ priceMin })} />
        <SelectField label="Max" value={query.priceMax} options={withSelected(BUDGETS, query.priceMax).map((v) => ({ value: v, label: formatPrice(v) }))} onChange={(priceMax) => set({ priceMax })} />
      </Row>
      <ChipGroup title="Body Type" group="body" options={facets?.body ?? []} />
      <ChipGroup title="Fuel" group="fuel" options={facets?.fuel ?? []} />
      <Transmission />
      <Row title="Mileage" active={query.kmMax !== undefined}>
        <SelectField label="Up to" value={query.kmMax} options={withSelected(KMS, query.kmMax).map((v) => ({ value: v, label: formatKm(v) }))} onChange={(kmMax) => set({ kmMax })} />
      </Row>
      <label className="flex min-h-11 items-center gap-3">
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
