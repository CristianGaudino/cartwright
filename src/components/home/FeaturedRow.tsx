"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";

// A row of cards that scrolls a page at a time: native scroll-snap, so a finger swipes it. The arrows sit beside the dots under the
// row, not over the cards, so the cards carry only their own photo arrows.
const arrow =
  "flex size-9 items-center justify-center rounded-full border border-hairline bg-card text-text transition-opacity duration-150 hover:bg-hairline";

// Where more than one card fits, a dot is a page, which is what the arrows move by. Where one card fits (a phone), a dot is a card.
// `unit` is how far one dot moves the row. Read from the row's own sizes, not copied (the gap is the row's gap-4).
function geometry(el: HTMLUListElement) {
  const first = el.firstElementChild as HTMLElement | null;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  const step = first ? first.offsetWidth + gap : el.clientWidth;
  const perCard = Math.floor((el.clientWidth + gap) / step) <= 1;
  return {
    unit: perCard ? step : el.clientWidth,
    pages: perCard ? el.children.length : Math.max(1, Math.round(el.scrollWidth / el.clientWidth)),
  };
}

export function FeaturedRow({ children, label }: { children: React.ReactNode; label: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ page: 0, pages: 1 });

  // Measured on scroll, and whenever the row is resized (the observer also fires once when it starts watching).
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { unit, pages } = geometry(el);
    setState({ pages, page: Math.min(pages - 1, Math.round(el.scrollLeft / unit)) });
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [measure]);
  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth });
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * geometry(el).unit });
  };

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className="relative">
      <ul
        ref={scroller}
        onScroll={measure}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 scrollbar-none motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {state.pages > 1 && (
        <>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" aria-label="Previous cars" onClick={() => go(-1)} className={`${arrow} ${state.page <= 0 ? "pointer-events-none opacity-30" : ""}`}>
              <ChevronLeftIcon className="size-5" />
            </button>
            <div className="flex items-center">
              {Array.from({ length: state.pages }, (_, i) => (
                <button key={i} type="button" aria-label={`Go to page ${i + 1} of ${state.pages}`} aria-current={i === state.page ? "true" : undefined} onClick={() => goTo(i)} className="group/dot flex size-6 items-center justify-center">
                  <span className={`size-2 rounded-full transition-colors ${i === state.page ? "bg-accent" : "bg-hairline group-hover/dot:bg-text-2"}`} />
                </button>
              ))}
            </div>
            <button type="button" aria-label="Next cars" onClick={() => go(1)} className={`${arrow} ${state.page >= state.pages - 1 ? "pointer-events-none opacity-30" : ""}`}>
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
