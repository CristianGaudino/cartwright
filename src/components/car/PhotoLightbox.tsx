"use client";

import { swipeRow } from "@/components/ui";
import Image from "next/image";
import { Brandmark } from "@/components/Brandmark";
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
  const go = (i: number) => scroller.current?.scrollTo({ left: Math.min(Math.max(i, 0), n - 1) * scroller.current.clientWidth });
  const atStart = index <= 0;
  const atEnd = index >= n - 1;

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={`Photos of ${name}`}
      onClose={onClose}
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
      <div ref={scroller} data-lightbox-scroller onScroll={onScroll} className={swipeRow}>
        {photos.map((photo, i) => (
          <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className="flex h-full w-full flex-none snap-start items-center justify-center">
            <Image src={photo.src} width={900} height={675} alt={`${name}, photo ${i + 1} of ${n}`} loading="lazy" decoding="async" draggable={false} className="h-full w-full max-w-[1200px] object-contain" />
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
