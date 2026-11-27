"use client";

import { swipeRow } from "@/components/ui";
import Image from "next/image";
import { Brandmark } from "@/components/Brandmark";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/stock/icons";
import { arrow, arrowEnd, counterPill, settle } from "@/components/stock/photo-load";
import { EASE_OUT, REDUCED_MOTION } from "@/components/motion";
import type { Photo } from "@/lib/stock/types";
import { useSlideIndex } from "./useSlideIndex";

// Where an object-contain photo's picture sits inside its box (the box is the whole slide, the picture is letterboxed in it).
function fitted(img: HTMLImageElement, r: DOMRect) {
  const ar = img.naturalWidth / img.naturalHeight || 4 / 3;
  const width = Math.min(r.width, r.height * ar);
  const height = width / ar;
  return { left: r.left + (r.width - width) / 2, top: r.top + (r.height - height) / 2, width, height };
}

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
  // The zoom toggle is a FLIP: the photo's place before the class change, and the tapped point (as a share of the picture) to centre.
  const flip = useRef<{ img: HTMLImageElement; before: DOMRect; fx: number; fy: number } | null>(null);
  const toggleZoom = (e?: MouseEvent) => {
    const img = scroller.current?.children[index]?.querySelector("img");
    if (img) {
      const before = img.getBoundingClientRect();
      const pic = fitted(img, before);
      const share = (v: number) => Math.min(Math.max(v, 0), 1);
      // Zooming out has no point to keep; the zoom button zooms on the middle.
      flip.current = { img, before, fx: e ? share((e.clientX - pic.left) / pic.width) : 0.5, fy: e ? share((e.clientY - pic.top) / pic.height) : 0.5 };
    }
    setZoom(!zoom);
  };
  useLayoutEffect(() => {
    const f = flip.current;
    flip.current = null;
    if (!f) return;
    const { img, before } = f;
    const box = img.parentElement!;
    if (zoom) {
      // Scroll the zoomed photo so the tapped point is in the middle of the screen.
      const r = img.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      box.scrollLeft += r.left + f.fx * r.width - (b.left + box.clientWidth / 2);
      box.scrollTop += r.top + f.fy * r.height - (b.top + box.clientHeight / 2);
    }
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    const now = img.getBoundingClientRect();
    const from = zoom ? fitted(img, before) : before; // the picture before
    const to = zoom ? now : fitted(img, now); // and after
    const s = from.width / to.width;
    const dx = from.left - now.left - s * (to.left - now.left);
    const dy = from.top - now.top - s * (to.top - now.top);
    img.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: "none" }], { duration: 220, easing: EASE_OUT });
  }, [zoom]);
  // Photos stay visible without JavaScript: the hide-until-loaded style only applies once this attribute is set.
  useEffect(() => scroller.current?.setAttribute("data-js", ""), [scroller]);
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
        // Zoomed, the arrows pan the photo (its box takes focus), so they do not change photo.
        if (zoom || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
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
        onClick={() => toggleZoom()}
        className="absolute right-4 top-18 z-10 flex size-11 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur-md reduce-transparency:bg-white reduce-transparency:backdrop-blur-none"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2M8.5 11h5" />
          {!zoom && <path d="M11 8.5v5" />}
        </svg>
      </button>
      <div ref={scroller} data-lightbox-scroller onScroll={onScroll} className={`group/pc ${swipeRow} ${zoom ? "overflow-x-hidden!" : ""}`}>
        {photos.map((photo, i) => (
          <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} tabIndex={zoom && i === index ? 0 : undefined} className={`flex h-full w-full flex-none snap-start ${zoom && i === index ? "overflow-auto" : "items-center justify-center"}`}>
            <Image
              ref={settle}
              src={photo.src}
              width={900}
              height={675}
              alt={`${name}, photo ${i + 1} of ${n}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              onClick={(e) => i === index && toggleZoom(e)}
              className={`peer origin-top-left transition-opacity duration-150 group-data-[js]/pc:opacity-0 group-data-[js]/pc:data-[loaded]:opacity-100 data-[failed]:hidden ${zoom && i === index ? "m-auto h-auto w-[250%] max-w-none cursor-zoom-out" : "h-full w-full max-w-[1200px] cursor-zoom-in object-contain"}`}
            />
            {/* A photo that fails to load leaves the same words as a car with no photos. */}
            <span aria-hidden="true" className="m-auto hidden text-meta text-text-2 peer-data-[failed]:block">No photo yet</span>
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
