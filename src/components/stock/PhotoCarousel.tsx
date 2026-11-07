"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Brandmark } from "@/components/Brandmark";
import { useSlideIndex } from "@/components/car/useSlideIndex";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import type { Photo } from "@/lib/stock/types";
import { arrow, arrowEnd, settle } from "./photo-load";

// Shown with the card's hover or any focus inside it.
const arrowLive = "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

// A card loads at most this many photos; the "See all n photos" slide after them opens the car page with the rest. A car with 12 photos
// would otherwise cost 12 images on a card, and a page of 12 cards over 70 (3.5 MB), which starved the first photo on a phone.
const CARD_PHOTOS = 4;

// Native scroll-snap gives 1:1 finger tracking, momentum and interruptibility: no gesture code.
export function PhotoCarousel({ photos: allPhotos, href, label, priority }: { photos: Photo[]; href: string; label: string; priority: boolean }) {
  const photos = allPhotos.slice(0, CARD_PHOTOS);
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Only the first photo is in the page at first, so on a phone it is not racing 40 others. The rest follow a second after the card
  // comes near the screen, or at once on the first touch or swipe. Without JavaScript the card shows its first photo and links to the car.
  const [more, setMore] = useState(false);
  const { ref: scroller, onScroll } = useSlideIndex(setIndex);

  // Photos stay visible without JavaScript: the hide-until-loaded style only applies once this attribute is set.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.setAttribute("data-js", "");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => (timer = setTimeout(() => setMore(true), 1000));
    if (typeof IntersectionObserver === "undefined") {
      later(); // an old browser: no way to tell if the card is near, so load them anyway
      return () => clearTimeout(timer);
    }
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      later();
    }, { rootMargin: "200px" });
    near.observe(el);
    return () => {
      near.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (photos.length === 0) {
    return <p className="flex h-full items-center justify-center text-meta text-text-2">No photo yet</p>;
  }
  const n = allPhotos.length;
  // Until the others are allowed there is one photo and the tile, so no slide is ever an empty box (and none is, without JavaScript).
  const visible = more ? photos : photos.slice(0, 1);
  const shown = visible.length;
  const tile = n >= 2; // the "See all n photos" slide sits at index `shown`, after the photos

  const atStart = index <= 0;
  const atEnd = index >= (tile ? shown : shown - 1);
  const go = (dir: 1 | -1) => {
    setMore(true); // an arrow press is a request for the next photo: no waiting for the timer
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth });
  };

  return (
    // z-10 lifts the carousel above the card's stretched title link, which would otherwise swallow swipes.
    <div ref={root} className="group/pc relative z-10 h-full">
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={() => setMore(true)}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${label}`}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((photo, i) => (
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
            <Brandmark />
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
      {shown > 1 && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {visible.map((photo, i) => (
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
