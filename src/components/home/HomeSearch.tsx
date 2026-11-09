"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { PriceRange } from "@/components/PriceRange";
import { IconBadge } from "@/components/Feature";
import { ArrowRightIcon, SearchIcon } from "@/components/stock/icons";
import { accentButton, card } from "@/components/ui";

type Option = { slug: string; label: string };
type Props = { makes: Option[]; bodies: Option[]; models: { makeSlug: string; slug: string; label: string }[] };

const tab = "relative inline-flex min-h-11 flex-1 items-center justify-center px-4 sm:flex-none sm:justify-start text-body font-semibold transition-colors";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";
const FIND_STEPS = ["Tell Us What You Want", "We Look for It", "We Get in Touch"];

// A plain GET form: /used-cars reads make, model, body, priceMin and priceMax from the URL (BRW-03). The drop-downs need scripts to pick from;
// without them it still goes to the stock, with nothing chosen.
// The mockup's "Find me a car" tab sits beside it. Search sets the height of the box; the Find panel lies over it, so switching tabs
// never moves the page. On a phone body type is left out (the stock page has it) to keep the box short.
export function HomeSearch({ makes, bodies, models }: Props) {
  const [tabName, setTab] = useState<"search" | "find">("search");
  const [make, setMake] = useState("");
  const id = useId();
  const shownModels = make ? models.filter((m) => m.makeSlug === make) : models;
  const [price, setPrice] = useState<{ min?: number; max?: number }>({});
  // `invisible`, not `hidden`: the search form stays in the flow (so it still sets the height), but is not seen, read or focusable.
  const panel = (t: "search" | "find") => `transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${tabName === t ? "" : "invisible opacity-0"}`;

  return (
    <div className={`${card} shadow-lift`}>
      <div role="tablist" aria-label="How to find a car" className="flex border-b border-hairline sm:px-2">
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
      <div className="relative">
        <div role="tabpanel" id={`${id}-panel-search`} aria-labelledby={`${id}-tab-search`} className={panel("search")}>
          <form action="/used-cars" method="get" className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-[repeat(5,1fr)_auto] lg:items-end lg:p-6">
            <Select name="make" label="Make" any="Any make" value={make} onChange={setMake} options={makes.map((m) => [m.slug, m.label])} />
            <Select key={make} name="model" label="Model" any="Any model" options={shownModels.map((m) => [m.slug, m.label])} />
            <Select name="body" label="Body Type" any="Any type" className="hidden sm:flex" options={bodies.map((b) => [b.slug, b.label])} />
            <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-2">
              <PriceRange label="Price" min={price.min} max={price.max} onCommit={(min, max) => setPrice({ min, max })} />
              {price.min !== undefined && <input type="hidden" name="priceMin" value={price.min} />}
              {price.max !== undefined && <input type="hidden" name="priceMax" value={price.max} />}
            </div>
            <button type="submit" className={`col-span-2 flex items-center justify-center gap-2 sm:col-span-3 lg:col-span-1 ${accentButton}`}>
              <SearchIcon className="size-5" />
              Search Cars
            </button>
          </form>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-find`}
          aria-labelledby={`${id}-tab-find`}
          className={`${panel("find")} absolute inset-0 flex flex-col justify-center gap-3 p-4 lg:flex-row lg:items-center lg:gap-8 lg:p-6`}
        >
          <div className="flex min-w-0 flex-col gap-1 lg:flex-1">
            <p className="text-heading font-semibold">Can&apos;t see the car you want?</p>
            <p className="text-body text-text-2">Tell us what you&apos;re looking for and we&apos;ll look for it.</p>
          </div>
          <ol className="hidden items-center gap-2 xl:flex">
            {FIND_STEPS.map((s, i) => (
              <li key={s} className="flex max-w-[13rem] items-center gap-2 rounded-control border border-hairline bg-surface/60 p-2 pr-3">
                <IconBadge size="sm">{i + 1}</IconBadge>
                <span className="text-meta text-text-2">{s}</span>
              </li>
            ))}
          </ol>
          <Link href="/find-a-car" className={`inline-flex items-center justify-center gap-2 lg:shrink-0 ${accentButton}`}>
            Ask Us to Find It
            <ArrowRightIcon className="size-5" />
          </Link>
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
  className = "flex",
}: {
  name: string;
  label: string;
  any: string;
  options: [string, string][];
  value?: string;
  onChange?(v: string): void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`${className} min-w-0 flex-col gap-1`}>
      <label htmlFor={id} className="text-meta font-semibold">
        {label}
      </label>
      <Combobox id={id} name={name} tone="surface" className="pl-3" options={[{ value: "", label: any }, ...options.map(([v, l]) => ({ value: v, label: l }))]} {...(onChange ? { value, onChange } : {})} />
    </div>
  );
}
