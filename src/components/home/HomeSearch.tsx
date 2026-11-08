"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { SearchIcon } from "@/components/stock/icons";
import { accentButton } from "@/components/ui";
import { formatPrice } from "@/lib/stock/format";
import { BUDGETS } from "@/lib/stock/types";

type Option = { slug: string; label: string };
type Props = { makes: Option[]; bodies: Option[]; models: { makeSlug: string; slug: string; label: string }[] };

const tab = "relative inline-flex min-h-11 items-center px-4 text-body font-semibold transition-colors";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";

// A plain GET form, so it works without JavaScript: /used-cars reads make, model, body and priceMax from the URL (BRW-03).
// The mockup's "Find me a car" tab sits beside it.
export function HomeSearch({ makes, bodies, models }: Props) {
  const [tabName, setTab] = useState<"search" | "find">("search");
  const [make, setMake] = useState("");
  const id = useId();
  const shownModels = make ? models.filter((m) => m.makeSlug === make) : models;

  return (
    <div className="rounded-card border border-hairline bg-card/80">
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
      <div role="tabpanel" id={`${id}-panel-search`} aria-labelledby={`${id}-tab-search`} hidden={tabName !== "search"}>
        <form action="/used-cars" method="get" className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-end lg:p-6">
          <Select name="make" label="Make" any="Any make" value={make} onChange={setMake} options={makes.map((m) => [m.slug, m.label])} />
          <Select key={make} name="model" label="Model" any="Any model" options={shownModels.map((m) => [m.slug, m.label])} />
          <Select name="body" label="Body Type" any="Any body type" options={bodies.map((b) => [b.slug, b.label])} />
          <Select name="priceMax" label="Price" any="Any price" options={BUDGETS.map((b) => [String(b), `Up to ${formatPrice(b)}`])} />
          <button type="submit" className={`col-span-2 flex items-center justify-center gap-2 lg:col-span-1 ${accentButton}`}>
            <SearchIcon className="size-5" />
            Search Cars
          </button>
        </form>
      </div>
      <div role="tabpanel" id={`${id}-panel-find`} aria-labelledby={`${id}-tab-find`} hidden={tabName !== "find"} className="flex flex-col items-start gap-4 p-4 lg:p-6">
        <p className="max-w-[65ch] text-body">Cannot see what you want? Tell us and we will look for it.</p>
        <Link href="/find-a-car" className={`inline-flex items-center ${accentButton}`}>
          Ask Us to Find It
        </Link>
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
