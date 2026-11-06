"use client";

import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/lib/stock/types";

// Native scroll-snap gives 1:1 finger tracking, momentum and interruptibility: no gesture code.
export function PhotoCarousel({ photos, href, label, priority }: { photos: Photo[]; href: string; label: string; priority: boolean }) {
  if (photos.length === 0) {
    return <p className="flex h-full items-center justify-center text-meta text-text-2">No photo yet</p>;
  }
  const n = photos.length;
  return (
    // z-10 lifts the carousel above the card's stretched title link, which would otherwise swallow swipes.
    <div className="relative z-10 h-full">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${label}`}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div key={photo.src} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}`} className="relative h-full w-full flex-none snap-start">
            <Link href={href} tabIndex={-1} aria-hidden="true">
              <Image
                src={photo.src}
                width={900}
                height={675}
                alt={`${label}, photo ${i + 1} of ${n}`}
                loading={priority && i === 0 ? "eager" : undefined}
                fetchPriority={priority && i === 0 ? "high" : undefined}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
