"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { IconBadge } from "@/components/Feature";
import { ArrowRightIcon, SearchIcon } from "@/components/stock/icons";
import { accentButton, card } from "@/components/ui";
import { formatPrice } from "@/lib/stock/format";
import { BUDGETS } from "@/lib/stock/types";

type Option = { slug: string; label: string };
type Props = { makes: Option[]; bodies: Option[]; models: { makeSlug: string; slug: string; label: string }[] };

const tab = "relative inline-flex min-h-11 items-center px-4 text-body font-semibold transition-colors";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";
const FIND_STEPS = ["Tell us the make, model and your budget", "We look for a car that fits", "We get in touch if we find one"];

// A plain GET form: /used-cars reads make, model, body, priceMin and priceMax from the URL (BRW-03). The drop-downs need scripts to pick from;
// without them it still goes to the stock, with nothing chosen.
// The mockup's "Find me a car" tab sits beside it. Both panels sit in one grid cell, so the box is as tall as the taller of the two and
// switching tabs never moves the page.
export function HomeSearch({ makes, bodies, models }: Props) {
  const [tabName, setTab] = useState<"search" | "find">("search");
  const [make, setMake] = useState("");
  const id = useId();
  const shownModels = make ? models.filter((m) => m.makeSlug === make) : models;
  const budgets = BUDGETS.map((b): [string, string] => [String(b), formatPrice(b)]);
  // `invisible`, not `hidden`: still in the grid cell (so it still counts toward the height), but not seen, read or focusable.
  const panel = (t: "search" | "find") => `col-start-1 row-start-1 transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${tabName === t ? "" : "invisible opacity-0"}`;

  return (
    <div className={`${card} shadow-lift`}>
      <div role="tablist" aria-label="How to find a car" className="flex border-b border-hairline px-2">
        {(["search", "find"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`${id}-tab-${t}`}
            aria-selected={tabName === t}
            aria-controls={`${id}-panel-${t}`}
            onClick={() => setTab(t)}
            className={`${tab} ${tabName === t ? `text-text ${bar}` : "text-text-2 hover:text-text"}`}
          >
            {t === "search" ? "Search Stock" : "Find Me a Car"}
          </button>
        ))}
      </div>
      <div className="grid">
        <div role="tabpanel" id={`${id}-panel-search`} aria-labelledby={`${id}-tab-search`} className={panel("search")}>
          <form action="/used-cars" method="get" className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-[repeat(5,1fr)_auto] lg:items-end lg:p-6">
            <Select name="make" label="Make" any="Any make" value={make} onChange={setMake} options={makes.map((m) => [m.slug, m.label])} />
            <Select key={make} name="model" label="Model" any="Any model" options={shownModels.map((m) => [m.slug, m.label])} />
            <Select name="body" label="Body Type" any="Any type" options={bodies.map((b) => [b.slug, b.label])} />
            <Select name="priceMin" label="Min Price" any="No min" options={budgets} />
            <Select name="priceMax" label="Max Price" any="No max" options={budgets} />
            <button type="submit" className={`col-span-2 flex items-center justify-center gap-2 lg:col-span-1 ${accentButton}`}>
              <SearchIcon className="size-5" />
              Search Cars
            </button>
          </form>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-find`}
          aria-labelledby={`${id}-tab-find`}
          className={`${panel("find")} grid grid-cols-1 gap-6 p-4 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-10 lg:p-6`}
        >
          <div className="flex flex-col items-start gap-3">
            <p className="text-heading font-semibold">Can&apos;t see the car you want?</p>
            <p className="max-w-[40ch] text-body text-text-2">Tell us what you&apos;re looking for and we&apos;ll look for it.</p>
            <Link href="/find-a-car" className={`mt-1 inline-flex items-center gap-2 ${accentButton}`}>
              Ask Us to Find It
              <ArrowRightIcon className="size-5" />
            </Link>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FIND_STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-control border border-hairline bg-surface/60 p-3 sm:flex-col sm:items-start">
                <IconBadge size="sm">{i + 1}</IconBadge>
                <span className="text-meta text-text-2">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// A labelled drop-down (the site's own, typeable once the list is long). Controlled only when a value is passed.
function Select({
  name,
  label,
  any,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  any: string;
  options: [string, string][];
  value?: string;
  onChange?(v: string): void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-meta font-semibold">
        {label}
      </label>
      <Combobox id={id} name={name} tone="surface" className="pl-3" options={[{ value: "", label: any }, ...options.map(([v, l]) => ({ value: v, label: l }))]} {...(onChange ? { value, onChange } : {})} />
    </div>
  );
}
