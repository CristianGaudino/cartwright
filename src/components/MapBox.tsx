"use client";

import { useState } from "react";
import { secondaryButton } from "@/components/ui";

// Nothing from Google loads until Show Map is tapped: no cookies, no consent question, no Lighthouse cost. The box is
// 4:3 from first paint, and Get Directions sits outside it so a blocked iframe or no JavaScript still leaves a way there.
export function MapBox({ embedUrl, directionsUrl, title, address }: { embedUrl: string; directionsUrl: string; title: string; address: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[4/3] overflow-hidden rounded-card border border-hairline bg-card contrast-more:border-text">
        {open ? (
          <iframe src={embedUrl} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="size-full border-0" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-body">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <button type="button" onClick={() => setOpen(true)} className={`h-12 px-6 ${secondaryButton}`}>
              Show map
            </button>
          </div>
        )}
      </div>
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start underline">
        Get directions<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
