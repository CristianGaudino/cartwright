"use client";

import { swipeRow } from "@/components/ui";
import Image from "next/image";
import { Brandmark } from "@/components/Brandmark";
import { useState } from "react";
import type { RefObject } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/stock/icons";
import { arrow, arrowEnd, counterPill } from "@/components/stock/photo-load";
import type { Photo } from "@/lib/stock/types";
import { useSlideIndex } from "./useSlideIndex";

// A native modal dialog: focus trap, inert page and Escape come from the platform. Always mounted; its images are lazy, so a closed dialog loads nothing.
export function PhotoLightbox({
  photos,
  name,
  dialogRef,
  index,
  onIndex,
  onClose,
}: {
  photos: Photo[];
  name: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { ref: scroller, onScroll } = useSlideIndex(onIndex);
  const n = photos.length;
  // Zoom shows the current photo at 2.5 times, panned by dragging or scrolling. It ends with a move to another photo or a close.
  const [zoomedAt, setZoomedAt] = useState<number | null>(null);
  const zoom = zoomedAt === index; // tied to the photo it started on, so moving to another photo ends it
  const setZoom = (on: boolean) => setZoomedAt(on ? index : null);
  const go = (i: number) => {
    setZoom(false);
    scroller.current?.scrollTo({ left: Math.min(Math.max(i, 0), n - 1) * scroller.current.clientWidth });
  };
  const atStart = index <= 0;
  const atEnd = index >= n - 1;

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={`Photos of ${name}`}
      onClose={() => {
        setZoom(false);
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        go(index + (e.key === "ArrowRight" ? 1 : -1));
      }}
    >
      {/* First in the tree so it takes the initial focus even where autofocus is not applied. */}
      <button
        type="button"
        autoFocus
        aria-label="Close photos"
        onClick={() => dialogRef.current?.close()}
        className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur-md reduce-transparency:bg-white reduce-transparency:backdrop-blur-none"
      >
        <CloseIcon />
      </button>
      <button
        type="button"
        aria-label={zoom ? "Zoom out" : "Zoom in"}
        aria-pressed={zoom}
        onClick={() => setZoom(!zoom)}
        className="absolute right-4 top-18 z-10 flex size-11 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur-md reduce-transparency:bg-white reduce-transparency:backdrop-blur-none"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2M8.5 11h5" />
          {!zoom && <path d="M11 8.5v5" />}
        </svg>
      </button>
      <div ref={scroller} data-lightbox-scroller onScroll={onScroll} className={`${swipeRow} ${zoom ? "overflow-x-hidden!" : ""}`}>
        {photos.map((photo, i) => (
          <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className={`flex h-full w-full flex-none snap-start ${zoom && i === index ? "overflow-auto" : "items-center justify-center"}`}>
            <Image src={photo.src} width={900} height={675} alt={`${name}, photo ${i + 1} of ${n}`} loading="lazy" decoding="async" draggable={false} sizes={zoom && i === index ? "250vw" : "100vw"} onClick={() => i === index && setZoom(!zoom)} className={zoom && i === index ? "m-auto h-auto w-[250%] max-w-none cursor-zoom-out" : "h-full w-full max-w-[1200px] cursor-zoom-in object-contain"} />
            <Brandmark />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <span aria-hidden="true" className={`${counterPill} left-4 top-4`}>
            {index + 1} / {n}
          </span>
          <button type="button" aria-label="Previous photo" aria-disabled={atStart} onClick={() => !atStart && go(index - 1)} className={`${arrow} left-4 ${atStart ? arrowEnd : ""}`}>
            <ChevronLeftIcon />
          </button>
          <button type="button" aria-label="Next photo" aria-disabled={atEnd} onClick={() => !atEnd && go(index + 1)} className={`${arrow} right-4 ${atEnd ? arrowEnd : ""}`}>
            <ChevronRightIcon />
          </button>
        </>
      )}
    </dialog>
  );
}
