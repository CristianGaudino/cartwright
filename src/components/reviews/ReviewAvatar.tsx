"use client";

import { settle } from "@/components/stock/photo-load";

// A reviewer's photo from Google. If it fails to load the circle stays, empty, rather than showing a broken-image symbol.
export function ReviewAvatar({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar; images are unoptimized on this Worker
    <img ref={settle} src={src} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-photo-bg data-[failed]:invisible" />
  );
}
