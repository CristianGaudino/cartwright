"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import type { Photo } from "@/lib/stock/types";

// Not onLoad/onError props: next/image re-sets src (and re-requests every photo) after hydration when onError is passed.
// A stable ref callback also catches photos that finished or failed before React hydrated (RESEARCH Pitfall 3).
const loaded = (e: Event) => ((e.currentTarget as HTMLImageElement).dataset.loaded = "");
const failed = (e: Event) => ((e.currentTarget as HTMLImageElement).dataset.failed = "");
function settle(el: HTMLImageElement | null) {
  if (!el) return;
  if (!el.complete) {
    el.addEventListener("load", loaded, { once: true });
    el.addEventListener("error", failed, { once: true });
  } else if (el.naturalWidth > 0) el.dataset.loaded = "";
  else el.dataset.failed = "";
}

const arrow =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur-md transition-opacity duration-150 reduce-transparency:bg-white reduce-transparency:backdrop-blur-none [@media(hover:hover)]:flex";
// Shown with the card's hover or any focus inside it.
const arrowLive = "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";
// At either end the button stays mounted and focusable (aria-disabled, no-op), so a keyboard user keeps their place and nothing shifts.
// It is invisible to the pointer, and only shows, dimmed, while it holds keyboard focus.
const arrowEnd = "pointer-events-none opacity-0 focus-visible:opacity-40";

// Native scroll-snap gives 1:1 finger tracking, momentum and interruptibility: no gesture code.
export function PhotoCarousel({ photos, href, label, priority }: { photos: Photo[]; href: string; label: string; priority: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);

  // Photos stay visible without JavaScript: the hide-until-loaded style only applies once this attribute is set.
  useEffect(() => {
    root.current?.setAttribute("data-js", "");
    return () => cancelAnimationFrame(frame.current);
  }, []);

  if (photos.length === 0) {
    return <p className="flex h-full items-center justify-center text-meta text-text-2">No photo yet</p>;
  }
  const n = photos.length;
  const tile = n >= 2; // the "See all n photos" slide sits at index n, after the photos

  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scroller.current;
      if (el?.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
    });
  };
  const atStart = index <= 0;
  const atEnd = index >= (tile ? n : n - 1);
  const go = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth });

  return (
    // z-10 lifts the carousel above the card's stretched title link, which would otherwise swallow swipes.
    <div ref={root} className="group/pc relative z-10 h-full">
      <div
        ref={scroller}
        onScroll={onScroll}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${label}`}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className="relative h-full w-full flex-none snap-start">
            {/* Out of the tab order (the card title is the keyboard link) but not hidden, so the photo and its alt stay readable. */}
            <Link href={href} tabIndex={-1}>
              <Image
                ref={settle}
                src={photo.src}
                width={900}
                height={675}
                alt={label}
                loading={priority && i === 0 ? "eager" : undefined}
                fetchPriority={priority && i === 0 ? "high" : undefined}
                draggable={false}
                className="h-full w-full object-cover transition-opacity duration-150 group-data-[js]/pc:opacity-0 group-data-[js]/pc:data-[loaded]:opacity-100 data-[failed]:invisible"
              />
            </Link>
          </div>
        ))}
        {tile && (
          <div role="group" aria-roledescription="slide" aria-label={`See all ${n} photos`} className="h-full w-full flex-none snap-start bg-photo-bg">
            <Link href={href} className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-meta font-semibold focus-visible:-outline-offset-2">
              <span className="flex size-11 items-center justify-center rounded-full bg-text text-ink">
                <ChevronRightIcon />
              </span>
              <span className="line-clamp-2">See all {n} photos</span>
            </Link>
          </div>
        )}
      </div>
      {n > 1 && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {photos.map((photo, i) => (
              <span key={photo.src} data-dot data-active={i === index ? "" : undefined} className="size-2 rounded-full bg-white/55 shadow-[0_0_2px_rgb(0_0_0/0.5)] data-[active]:bg-white" />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous photo"
            aria-disabled={atStart}
            onClick={() => !atStart && go(-1)}
            className={`${arrow} left-2 ${atStart ? arrowEnd : arrowLive}`}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            aria-disabled={atEnd}
            onClick={() => !atEnd && go(1)}
            className={`${arrow} right-2 ${atEnd ? arrowEnd : arrowLive}`}
          >
            <ChevronRightIcon />
          </button>
        </>
      )}
    </div>
  );
}
