// Not onLoad/onError props: next/image re-sets src (and re-requests every photo) after hydration when onError is passed.
// A stable ref callback also catches photos that finished or failed before React hydrated (RESEARCH Pitfall 3).
const loaded = (e: Event) => ((e.currentTarget as HTMLImageElement).dataset.loaded = "");
const failed = (e: Event) => ((e.currentTarget as HTMLImageElement).dataset.failed = "");
export function settle(el: HTMLImageElement | null) {
  if (!el) return;
  if (!el.complete) {
    el.addEventListener("load", loaded, { once: true });
    el.addEventListener("error", failed, { once: true });
  } else if (el.naturalWidth > 0) el.dataset.loaded = "";
  else el.dataset.failed = "";
}

// Shared by the card carousel, the car gallery and the lightbox.
export const arrow =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur-md transition-opacity duration-150 reduce-transparency:bg-white reduce-transparency:backdrop-blur-none [@media(hover:hover)]:flex hover:bg-white";
// At either end the button stays mounted and focusable (aria-disabled, no-op), so a keyboard user keeps their place and nothing shifts.
// It is invisible to the pointer, and only shows, dimmed, while it holds keyboard focus.
export const arrowEnd = "pointer-events-none opacity-0 focus-visible:opacity-40";
// The "{i} / {n}" pill; the caller adds its position.
export const counterPill =
  "pointer-events-none absolute flex h-7 items-center rounded-full bg-[rgb(14_14_16/0.6)] px-3 text-meta font-semibold text-white backdrop-blur-[20px] reduce-transparency:bg-ink reduce-transparency:backdrop-blur-none contrast-more:border contrast-more:border-white";
