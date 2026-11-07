"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";

const GAP = 16; // the row's gap-4, in pixels

// A row of cards that scrolls a page at a time: native scroll-snap, so a finger swipes it. Arrows on pointer devices, dots always.
const arrow =
  "absolute top-[40%] z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-card text-text transition-opacity duration-150 hover:bg-hairline [@media(hover:hover)]:flex";

export function FeaturedRow({ children, label }: { children: React.ReactNode; label: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ page: 0, pages: 1 });

  // Measured on scroll, and whenever the row is resized (the observer also fires once when it starts watching).
  // Where more than one card fits, a dot is a page, which is what the arrows move by. Where one card fits (a phone), a dot is a card.
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + GAP : el.clientWidth;
    const perCard = Math.floor((el.clientWidth + GAP) / step) <= 1;
    const unit = perCard ? step : el.clientWidth;
    const pages = perCard ? el.children.length : Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    setState({ pages, page: Math.min(pages - 1, Math.round(el.scrollLeft / unit)) });
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth });

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
          <button type="button" aria-label="Previous cars" onClick={() => go(-1)} className={`${arrow} -left-5 ${state.page <= 0 ? "pointer-events-none opacity-0" : ""}`}>
            <ChevronLeftIcon />
          </button>
          <button type="button" aria-label="Next cars" onClick={() => go(1)} className={`${arrow} -right-5 ${state.page >= state.pages - 1 ? "pointer-events-none opacity-0" : ""}`}>
            <ChevronRightIcon />
          </button>
          <div aria-hidden="true" className="mt-4 flex justify-center gap-2">
            {Array.from({ length: state.pages }, (_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === state.page ? "bg-accent" : "bg-hairline"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
