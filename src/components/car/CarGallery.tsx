"use client";

import { swipeRow } from "@/components/ui";
import Image from "next/image";
import { Brandmark } from "@/components/Brandmark";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { arrow, arrowEnd, counterPill, settle } from "@/components/stock/photo-load";
import type { Photo } from "@/lib/stock/types";
import { PhotoLightbox } from "./PhotoLightbox";
import { useSlideIndex } from "./useSlideIndex";


// Native scroll-snap, as the card carousel. Only photos and a name cross from the server, never the Car.
export function CarGallery({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const { ref: scroller, onScroll } = useSlideIndex(setIndex);
  const [lightIndex, setLightIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = photos.length;

  // Photos stay visible without JavaScript: the hide-until-loaded style only applies once this attribute is set.
  useEffect(() => root.current?.setAttribute("data-js", ""), []);

  // Keep the active thumb in view by scrolling the strip itself: the element's own into-view method would also scroll the page (RESEARCH Pitfall 9).
  useEffect(() => {
    const thumb = strip.current?.children[index] as HTMLElement | undefined;
    if (strip.current && thumb) strip.current.scrollTo({ left: thumb.offsetLeft - (strip.current.clientWidth - thumb.offsetWidth) / 2 });
  }, [index]);

  if (n === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-photo-bg">
        <p className="text-meta text-text-2">No photo yet</p>
      </div>
    );
  }
  const show = (i: number) => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth });
  // showModal() first: a closed dialog has no width, so the scroller can only be positioned once it is open (RESEARCH Pitfall 10).
  const openLightbox = (i: number, from: HTMLElement) => {
    opener.current = from;
    setLightIndex(i);
    dialog.current?.showModal();
    const lb = dialog.current?.querySelector<HTMLElement>("[data-lightbox-scroller]");
    lb?.scrollTo({ left: i * lb.clientWidth, behavior: "instant" });
  };
  const atStart = index <= 0;
  const atEnd = index >= n - 1;

  return (
    <div data-testid="gallery">
      <div ref={root} className="group group/pc relative aspect-[4/3] overflow-hidden rounded-card bg-photo-bg">
        <div
          ref={scroller}
          onScroll={onScroll}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Photos of ${name}`}
          className={swipeRow}
        >
          {photos.map((photo, i) => (
            <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className="relative h-full w-full flex-none snap-start">
              <button type="button" aria-label={`View photo ${i + 1} of ${n} larger`} onClick={(e) => openLightbox(i, e.currentTarget)} className="block size-full focus-visible:-outline-offset-2">
                <Image
                  ref={settle}
                  src={photo.src}
                  width={900}
                  height={675}
                  alt={`${name}, photo ${i + 1} of ${n}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding={i === 0 ? undefined : "async"}
                  draggable={false}
                  className="h-full w-full object-cover transition-opacity duration-150 group-data-[js]/pc:opacity-0 group-data-[js]/pc:data-[loaded]:opacity-100 data-[failed]:invisible"
                />
              </button>
              <Brandmark />
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <span aria-hidden="true" className={`${counterPill} bottom-4 right-4`}>
              {index + 1} / {n}
            </span>
            <button type="button" aria-label="Previous photo" aria-disabled={atStart} onClick={() => !atStart && show(index - 1)} className={`${arrow} left-2 ${atStart ? arrowEnd : ""}`}>
              <ChevronLeftIcon />
            </button>
            <button type="button" aria-label="Next photo" aria-disabled={atEnd} onClick={() => !atEnd && show(index + 1)} className={`${arrow} right-2 ${atEnd ? arrowEnd : ""}`}>
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div ref={strip} className="relative -mx-1 mt-1 hidden snap-x gap-2 overflow-x-auto p-1 scrollbar-none motion-safe:scroll-smooth lg:flex [&::-webkit-scrollbar]:hidden">
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => show(i)}
              className={`h-15 w-20 flex-none snap-start overflow-hidden rounded-control bg-photo-bg ${i === index ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
            >
              <Image src={photo.src} width={80} height={60} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <PhotoLightbox photos={photos} name={name} dialogRef={dialog} index={lightIndex} onIndex={setLightIndex} onClose={() => opener.current?.focus()} />
    </div>
  );
}
