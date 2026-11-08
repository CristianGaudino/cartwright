"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/stock/icons";

export type ComboOption = { value: string; label: string };

// Search ignores case and accents, as the stock search does.
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
// A short list is a plain picker (no keyboard on a phone); a longer one can be typed into and narrows as the buyer types.
const TYPEABLE_FROM = 6;
// A list is at most this tall (18rem: six options without a scrollbar). With less than LIST_ROOM_PX below the field it opens upward if there is more room above.
const LIST_MAX_PX = 288;
const LIST_MIN_PX = 120;
const LIST_ROOM_PX = 300;
const LIST_GAP_PX = 4;

// Where the open list sits, in viewport coordinates: it is in the top layer (a popover), so no scrolling or clipping ancestor
// (the filter panel, a dialog's body) can cut it off.
type Place = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

// The site's one drop-down, in place of the browser's own. The ARIA 1.2 combobox pattern: an input that shows the chosen label, a list
// of options under it, arrow keys, Enter, Escape, and a hidden input so a plain form still sends `name`. Controlled when `value` is
// passed, otherwise it keeps its own value (from `defaultValue`). `tone` is the fill, to read as a well on a card or on the page.
export function Combobox({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  tone = "card",
  className = "",
  invalid,
  describedBy,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?(value: string): void;
  options: ComboOption[];
  tone?: "card" | "surface";
  className?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const auto = useId();
  const uid = id ?? auto;
  const listId = `${uid}-list`;
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string | null>(null); // null: show the chosen label; a string: what the buyer has typed
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Place>();
  const root = useRef<HTMLDivElement>(null);
  const typeable = options.length >= TYPEABLE_FROM;
  const shown = useMemo(() => (typed ? options.filter((o) => fold(o.label).includes(fold(typed))) : options), [options, typed]);

  const measure = useCallback(() => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - LIST_GAP_PX;
    const above = r.top - LIST_GAP_PX;
    const up = below < LIST_ROOM_PX && above > below; // little room below and more above, as for a field at the foot of a sheet
    setPlace({
      left: r.left,
      width: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + LIST_GAP_PX } : { top: r.bottom + LIST_GAP_PX }),
      maxHeight: Math.min(LIST_MAX_PX, Math.max(LIST_MIN_PX, up ? above : below)),
    });
  }, []);
  const show = () => {
    measure();
    setActive(Math.max(0, shown.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  // The list follows its field while the page or a panel scrolls or the window changes size.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);
  // Shown in the top layer as soon as it is in the page. Without popover support it stays where it is, fixed in place.
  const toTopLayer = useCallback((el: HTMLUListElement | null) => {
    if (el && !el.matches(":popover-open")) {
      try {
        el.showPopover();
      } catch {}
    }
  }, []);
  const close = () => {
    setOpen(false);
    setTyped(null);
  };
  const choose = (o: ComboOption) => {
    if (value === undefined) setInner(o.value);
    onChange?.(o.value);
    close();
  };

  useEffect(() => {
    if (open) document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, uid]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      setActive((a) => Math.min(shown.length - 1, Math.max(0, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // choosing, not submitting the form
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation(); // a dialog around it keeps its own Escape for the next press
      close();
    } else if (e.key === " " && !typeable) {
      e.preventDefault();
      if (open) close();
      else show();
    }
  };

  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      {name && <input type="hidden" name={name} value={current} />}
      <input
        id={uid}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete={typeable ? "list" : "none"}
        aria-activedescendant={open && shown[active] ? `${uid}-opt-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        readOnly={!typeable}
        value={open && typed !== null ? typed : (selected?.label ?? "")}
        onChange={(e) => {
          setTyped(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(e) => typeable && e.currentTarget.select()}
        onClick={() => {
          if (!open) show();
          else if (!typeable) close();
        }}
        onKeyDown={onKeyDown}
        className={`h-12 w-full min-w-0 cursor-pointer truncate rounded-control border border-control py-0 pr-10 text-body ${tone === "card" ? "bg-card" : "bg-surface"} aria-[invalid=true]:border-destructive ${className}`}
      />
      <ChevronDownIcon className={`pointer-events-none absolute right-3 top-3 h-6 w-6 transition-transform ${open ? "rotate-180" : ""}`} />
      {open && (
        <ul
          ref={toTopLayer}
          popover="manual"
          id={listId}
          role="listbox"
          // mousedown anywhere on the list (an option, the gaps, the scrollbar) would take focus from the input and close the list
          onMouseDown={(e) => e.preventDefault()}
          // `inset: auto` first: a popover's own style pins it to every edge
          style={{ inset: "auto", margin: 0, ...place }}
          className="fixed z-50 min-w-40 overflow-y-auto overscroll-contain rounded-control border border-control bg-card p-1 text-text shadow-lift"
        >
          {shown.length === 0 && (
            <li role="presentation" className="px-3 py-2.5 text-body text-text-2">
              No match
            </li>
          )}
          {shown.map((o, i) => (
            <li
              key={o.value}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={o.value === current}
              onClick={() => choose(o)}
              onMouseMove={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-body active:bg-hairline ${i === active ? "bg-hairline" : ""} ${o.value === current ? "font-semibold" : ""}`}
            >
              <span className="min-w-0 truncate">{o.label}</span>
              {o.value === current && <CheckIcon className="size-4 shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
