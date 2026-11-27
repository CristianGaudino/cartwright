"use client";

import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { REDUCED_MOTION, scrollBehavior } from "@/components/motion";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/stock/icons";

// A row of cards that drifts along by itself, smoothly. A mouse over it holds it still until the mouse leaves; a finger holds it while it is down and for a
// few seconds after, then it drifts on (a phone has no hover to hand it back, and a carousel that never restarts looks broken). It is a plain scrolling row, so a finger swipes it. At either end it turns round. Used for the featured cars,
// the reviews and the similar cars. The arrows and dots sit under the row from 768px, not over the cards; on a phone the row is just swiped.
// Pause stops the drift for good (WCAG 2.2.2), on a phone too, until Play; it is not remembered past the page.
const SPEED = 36; // px a second: slow enough to read a card as it goes by
const RESUME = 4000; // ms of quiet after a finger lifts before the drift starts again
const control = "flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-card text-text transition-[opacity,background-color] duration-150 hover:bg-hairline";

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

function watchReducedMotion(onChange: () => void) {
  const q = window.matchMedia(REDUCED_MOTION);
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
  const [state, setState] = useState({ page: 0, pages: 0 }); // pages 0: not measured yet
  const reduced = useSyncExternalStore<boolean | null>(watchReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => null); // null until read: no moving
  // The controls row is drawn from the server for a row of more than one card, so it never arrives after the page and pushes it down.
  // shortcut: a row whose cards all fit drops its row once measured, a small shift up; measure on the server if that ever shows.
  const controls = state.pages > 1 || (state.pages === 0 && Children.count(children) > 1);
  const [paused, setPaused] = useState(false);
  const using = useRef({ over: false, within: false, touchedAt: -Infinity }); // touchedAt: Infinity while a finger is down, else when it lifted

  const unit = useRef(1);
  // Measured whenever the row is resized (the observer also fires once when it starts watching). Not on scroll: scroll fires every frame
  // of a drift, and reading sizes right after the drift writes scrollLeft would force a layout each frame.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const g = geometry(el);
    unit.current = g.unit;
    const page = Math.min(g.pages - 1, Math.round(el.scrollLeft / g.unit));
    setState((s) => (s.pages === g.pages && s.page === page ? s : { pages: g.pages, page }));
  }, []);
  // On scroll only the page is worked out, from the measured unit. The same answer is no render.
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const at = Math.round(el.scrollLeft / unit.current);
    setState((s) => {
      const page = Math.max(0, Math.min(s.pages - 1, at));
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

  // The drift: a frame at a time, not while the pointer is over it, focus is in it, a finger has touched it, the tab is hidden or the row is
  // off screen. `pos` is kept apart from scrollLeft, which a screen may round to whole pixels and so stall a slow move.
  useEffect(() => {
    const el = scroller.current;
    const box = root.current;
    if (!el || !box || reduced !== false || paused) return;
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
      if (!(u.over || u.within || document.hidden || now - u.touchedAt < RESUME)) {
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
  }, [reduced, paused]);

  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth, behavior: scrollBehavior() });
  const goTo = (i: number) => scroller.current?.scrollTo({ left: i * unit.current, behavior: scrollBehavior() });

  return (
    <div
      ref={root}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="relative"
      onPointerEnter={(e) => (using.current.over = e.pointerType === "mouse")}
      onPointerLeave={() => (using.current.over = false)}
      onPointerDown={(e) => { if (e.pointerType !== "mouse") using.current.touchedAt = Infinity; }}
      onPointerUp={(e) => { if (e.pointerType !== "mouse") using.current.touchedAt = performance.now(); }}
      onPointerCancel={(e) => { if (e.pointerType !== "mouse") using.current.touchedAt = performance.now(); }}
      onFocus={(e) => (using.current.within = !(e.target as HTMLElement).closest("[data-playpause]"))} // focus left on Play after a press must not hold the drift
      onBlur={() => (using.current.within = false)}
    >
      <ul
        ref={scroller}
        onScroll={onScroll}
        className="relative flex gap-4 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {controls && (
        <div className="mt-4 flex min-h-11 items-center justify-center gap-3">
          <button type="button" aria-label={`Previous ${noun}`} onClick={() => go(-1)} className={`${control} max-md:hidden ${state.page <= 0 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronLeftIcon className="size-5" />
          </button>
          {/* A dot per page, while the row of controls has room: four on a phone, sixteen from md up. After that, a count. */}
          <div className={`items-center max-md:hidden ${state.pages <= 4 ? "flex" : state.pages <= 16 ? "hidden md:flex" : "hidden"}`}>
            {Array.from({ length: state.pages }, (_, i) => (
              <button key={i} type="button" aria-label={`Go to page ${i + 1} of ${state.pages}`} aria-current={i === state.page ? "true" : undefined} onClick={() => goTo(i)} className="group/dot flex size-6 items-center justify-center">
                <span className={`rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-colors ${i === state.page ? "h-2 w-5 bg-accent" : "size-2 bg-control group-hover/dot:bg-text-2"}`} />
              </button>
            ))}
          </div>
          <p aria-hidden="true" className={`text-meta tabular-nums text-text-2 max-md:hidden ${state.pages <= 4 ? "hidden" : state.pages <= 16 ? "md:hidden" : ""}`}>
            {state.page + 1} / {state.pages}
          </p>
          <button type="button" aria-label={`Next ${noun}`} onClick={() => go(1)} className={`${control} max-md:hidden ${state.page >= state.pages - 1 ? "pointer-events-none opacity-30" : ""}`}>
            <ChevronRightIcon className="size-5" />
          </button>
          {/* Held in place, unseen, until reduced motion is read; then gone if it is on. */}
          {reduced !== true && (
            <button type="button" data-playpause aria-label={`${paused ? "Play" : "Pause"} ${noun}`} onClick={() => setPaused(!paused)} className={`${control} ${reduced === null ? "invisible" : ""}`}>
              {paused ? <PlayIcon className="size-5" /> : <PauseIcon className="size-5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
