"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/stock/icons";

// A row of cards that drifts along by itself, smoothly, and stops while the buyer is using it. It is a plain scrolling row, so a finger swipes
// it. At either end it turns round. Used for the featured cars, the reviews and the similar cars. The arrows, dots and a pause button sit
// under the row, not over the cards.
const SPEED = 36; // px a second: slow enough to read a card as it goes by
const RESUME_AFTER = 4000; // ms after a touch before it drifts again
const control = "flex size-9 items-center justify-center rounded-full border border-hairline bg-card text-text transition-[opacity,background-color] duration-150 hover:bg-hairline";

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

const REDUCED = "(prefers-reduced-motion: reduce)";
function watchReducedMotion(onChange: () => void) {
  const q = window.matchMedia(REDUCED);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

export function AutoCarousel({
  children,
  label,
  noun = "cars",
}: {
  children: React.ReactNode;
  label: string;
  noun?: string; // what the cards are, for the arrows' names: "Next cars", "Next reviews"
}) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ page: 0, pages: 1 });
  const [stopped, setStopped] = useState(false); // the buyer pressed Pause
  const reduced = useSyncExternalStore(watchReducedMotion, () => window.matchMedia(REDUCED).matches, () => true); // true until read: no moving
  const using = useRef({ over: false, within: false, lastTouch: 0 });

  // Measured on scroll, and whenever the row is resized (the observer also fires once when it starts watching).
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { unit, pages } = geometry(el);
    const page = Math.min(pages - 1, Math.round(el.scrollLeft / unit));
    setState((s) => (s.pages === pages && s.page === page ? s : { pages, page })); // the same answer is no render: scroll fires every frame of a drift
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [measure]);

  // The drift: a frame at a time, not while the pointer is over it, focus is in it, a finger touched it lately, the tab is hidden or the row is
  // off screen. `pos` is kept apart from scrollLeft, which a screen may round to whole pixels and so stall a slow move.
  useEffect(() => {
    const el = scroller.current;
    const box = root.current;
    if (!el || !box || stopped || reduced) return;
    let pos = el.scrollLeft;
    let dir = 1;
    let last = 0;
    let frame = 0;
    // Frames run only while the row is on screen, so a row far down the page costs nothing.
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 100) / 1000 : 0; // a long gap (tab away) is not caught up
      last = now;
      const u = using.current;
      if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft; // the buyer, an arrow or a dot moved it
      if (!(u.over || u.within || document.hidden || Date.now() - u.lastTouch < RESUME_AFTER)) {
        const max = el.scrollWidth - el.clientWidth;
        pos = Math.max(0, Math.min(max, pos + dir * SPEED * dt));
        if (pos >= max) dir = -1;
        else if (pos <= 0) dir = 1;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };
    const seen = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      last = 0;
      if (e.isIntersecting) frame = requestAnimationFrame(tick);
    });
    seen.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
    };
  }, [stopped, reduced]);

  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth, behavior: "smooth" });
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * geometry(el).unit, behavior: "smooth" });
  };

  return (
    <div
      ref={root}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="relative"
      onPointerEnter={(e) => (using.current.over = e.pointerType === "mouse")}
      onPointerLeave={() => (using.current.over = false)}
      onPointerDown={() => (using.current.lastTouch = Date.now())}
      onFocus={() => (using.current.within = true)}
      onBlur={() => (using.current.within = false)}
    >
      <ul
        ref={scroller}
        onScroll={measure}
        className="relative flex gap-4 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {state.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" aria-label={`Previous ${noun}`} onClick={() => go(-1)} className={`${control} ${state.page <= 0 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronLeftIcon className="size-5" />
          </button>
          <div className="flex items-center">
            {Array.from({ length: state.pages }, (_, i) => (
              <button key={i} type="button" aria-label={`Go to page ${i + 1} of ${state.pages}`} aria-current={i === state.page ? "true" : undefined} onClick={() => goTo(i)} className="group/dot flex size-6 items-center justify-center">
                <span className={`rounded-full transition-all duration-200 ${i === state.page ? "h-2 w-5 bg-accent" : "size-2 bg-hairline group-hover/dot:bg-text-2"}`} />
              </button>
            ))}
          </div>
          <button type="button" aria-label={`Next ${noun}`} onClick={() => go(1)} className={`${control} ${state.page >= state.pages - 1 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronRightIcon className="size-5" />
          </button>
          {!reduced && (
            <button type="button" aria-label={stopped ? `Start moving the ${noun} along` : `Stop moving the ${noun} along`} aria-pressed={stopped} onClick={() => setStopped((s) => !s)} className={control}>
              {stopped ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
