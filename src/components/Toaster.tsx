"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/stock/icons";
import { EASE_OUT, REDUCED_MOTION } from "./motion";
import { dismissToast, useToast } from "./toast";

const SHOW_MS = 6000;

// The one toast, announced politely. It stays while it is hovered or holds focus, so Undo can be reached, and goes after six seconds.
export function Toaster() {
  const toast = useToast();
  // Which toast the pointer or focus is on. Held per toast, so one removed under the pointer (Undo) cannot freeze the next.
  const [heldId, setHeldId] = useState<number | null>(null);
  const held = toast !== null && heldId === toast.id;
  const box = useRef<HTMLDivElement>(null);
  const leaving = useRef<Animation | null>(null);

  // Out faster than it came in: a 150ms fade, with a small drop unless motion is reduced, then gone. Undo stays instant.
  const leave = useCallback(() => {
    const el = box.current;
    if (!el || leaving.current) return;
    const drop = matchMedia(REDUCED_MOTION).matches ? {} : { translate: "0 8px" };
    leaving.current = el.animate([{ opacity: 1 }, { opacity: 0, ...drop }], { duration: 150, easing: EASE_OUT, fill: "forwards" });
    leaving.current.finished.then(dismissToast, () => {}); // cancelled: a new toast came in, and stays
  }, []);
  // A new toast (or none) ends the old one's leaving, so it can never dismiss the toast after it.
  useEffect(
    () => () => {
      leaving.current?.cancel();
      leaving.current = null;
    },
    [toast?.id],
  );

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(leave, SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast, held, leave]);

  return (
    <div aria-live="polite" className="flex w-full justify-center">
      {toast && (
        <div
          key={toast.id}
          ref={box}
          data-testid="toast"
          onMouseEnter={() => setHeldId(toast.id)}
          onMouseLeave={() => setHeldId(null)}
          onFocus={() => setHeldId(toast.id)}
          onBlur={() => setHeldId(null)}
          className="pointer-events-auto flex max-w-full items-center gap-3 rounded-control border border-hairline bg-card py-1 pl-4 pr-1 text-meta shadow-lift transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
        >
          <p className="min-w-0 font-semibold">{toast.message}</p>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                dismissToast();
              }}
              className="min-h-11 shrink-0 rounded-control px-3 font-semibold underline"
            >
              Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={leave} className="flex size-11 shrink-0 items-center justify-center rounded-control">
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
