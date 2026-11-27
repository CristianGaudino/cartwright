"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { EASE_OUT, REDUCED_MOTION, scrollBehavior } from "@/components/motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";

// A row of cards that stays still until the buyer moves it: swiped with snap on a phone, where the next card peeks in so the row
// plainly scrolls, and paged by the arrows and dots under it from 768px. Used for the featured cars, the reviews and the similar cars.
// The first time a row is half on screen it nudges once, a third of a card left and back, so a buyer sees it moves. Under 1.5s, so
// WCAG 2.2.2 needs no Pause; never under reduced motion, never on a row that cannot scroll, and any touch, wheel, key or focus stops it.
const NUDGE = 1200; // ms, there and back
const control = "flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-card text-text transition-[opacity,background-color] duration-150 hover:bg-hairline";

// Where more than one card fits, a dot is a page, which is what the arrows move by. Where one card fits (a phone), a dot is a card.
// `unit` is how far one dot moves the row: a screen and the gap after it, so the next page starts on a card. Read from the row's
// own sizes, not copied (the gap is the row's gap-4). Any overflow is a page (five reviews four across are two), and the end of
// the row is always the last page. `end`: the scrollLeft from there on, less a pixel for rounding.
function geometry(el: HTMLUListElement) {
  const first = el.firstElementChild as HTMLElement | null;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  const step = first ? first.offsetWidth + gap : el.clientWidth;
  const perCard = Math.floor((el.clientWidth + gap) / step) <= 1;
  const unit = perCard ? step : el.clientWidth + gap;
  const end = el.scrollWidth - el.clientWidth - 1;
  return { unit, end, pages: perCard ? el.children.length : 1 + Math.max(0, Math.ceil(end / unit)) };
}

export function CardRow({
  children,
  label,
  noun = "cars",
}: {
  children: React.ReactNode;
  label: string;
  noun?: string; // what the cards are, for the arrows' names: "Next cars", "Next reviews"
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ page: 0, pages: 0 }); // pages 0: not measured yet
  // The controls row is drawn from the server for a row of more than one card, so it never arrives after the page and pushes it down.
  // It is only there from 768px; on a phone the row is swiped and the controls row is not drawn at all.
  // shortcut: a row whose cards all fit drops its row once measured, a small shift up; measure on the server if that ever shows.
  const controls = state.pages > 1 || (state.pages === 0 && Children.count(children) > 1);
  const nudge = useRef<Animation[] | null>(null); // null: not nudged yet; then the running nudge, or none

  const size = useRef({ unit: 1, end: 0 });
  // The last page only at the end of the row, so Next stays live until the last card is in full view.
  const pageAt = (left: number, pages: number) =>
    left >= size.current.end ? pages - 1 : Math.max(0, Math.min(pages - 2, Math.round(left / size.current.unit)));
  // Measured whenever the row is resized (the observer also fires once when it starts watching). Not on scroll, which fires every frame
  // of a swipe: reading sizes there would force a layout each time.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const g = geometry(el);
    size.current = g;
    const page = pageAt(el.scrollLeft, g.pages);
    setState((s) => (s.pages === g.pages && s.page === page ? s : { pages: g.pages, page }));
  }, []);
  // On scroll only the page is worked out, from the measured sizes. The same answer is no render.
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft;
    setState((s) => {
      const page = pageAt(left, s.pages);
      return page === s.page ? s : { ...s, page };
    });
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [measure]);

  // The nudge: the cards slide, not the row, so scrollLeft, snap and the page never move. Asked once, when the row is first half on screen.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        seen.disconnect();
        const cards = [...el.children] as HTMLElement[];
        const room = el.scrollWidth - el.clientWidth;
        if (nudge.current || room < 1 || el.scrollLeft > 0 || !cards[0] || window.matchMedia(REDUCED_MOTION).matches) return;
        const by = Math.min(room, cards[0].offsetWidth / 3);
        const keys = [{ translate: "0", easing: EASE_OUT }, { translate: `${-by}px`, offset: 0.4, easing: EASE_OUT }, { translate: "0" }];
        nudge.current = cards.map((c) => c.animate(keys, NUDGE));
      },
      { threshold: 0.5 },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  // Any hand on the row ends the nudge at once, or stops it before it starts.
  const stop = () => {
    nudge.current?.forEach((a) => a.cancel());
    nudge.current = [];
  };

  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * size.current.unit, behavior: scrollBehavior() });
  const goTo = (i: number) => scroller.current?.scrollTo({ left: i * size.current.unit, behavior: scrollBehavior() });

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className="relative" onPointerDown={stop} onWheel={stop} onKeyDown={stop} onFocus={stop}>
      <ul
        ref={scroller}
        onScroll={onScroll}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 *:snap-start scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {controls && (
        <div className="mt-4 flex min-h-11 items-center justify-center gap-3 max-md:hidden">
          <button type="button" aria-label={`Previous ${noun}`} onClick={() => go(-1)} className={`${control} ${state.page <= 0 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronLeftIcon className="size-5" />
          </button>
          {/* A dot per page, while the row of controls has room: sixteen. After that, a count. */}
          <div className={`items-center ${state.pages <= 16 ? "flex" : "hidden"}`}>
            {Array.from({ length: state.pages }, (_, i) => (
              <button key={i} type="button" aria-label={`Go to page ${i + 1} of ${state.pages}`} aria-current={i === state.page ? "true" : undefined} onClick={() => goTo(i)} className="group/dot flex size-6 items-center justify-center">
                <span className={`rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-colors ${i === state.page ? "h-2 w-5 bg-accent" : "size-2 bg-control group-hover/dot:bg-text-2"}`} />
              </button>
            ))}
          </div>
          <p aria-hidden="true" className={`text-meta tabular-nums text-text-2 ${state.pages <= 16 ? "hidden" : ""}`}>
            {state.page + 1} / {state.pages}
          </p>
          <button type="button" aria-label={`Next ${noun}`} onClick={() => go(1)} className={`${control} ${state.page >= state.pages - 1 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
