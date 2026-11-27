"use client";

import { useCloseAtDesktop } from "@/components/useCloseAtDesktop";
import { useEffect, useId, useRef, useState } from "react";
import { appliedFilters, clearFilters } from "@/lib/stock/query";
import { CloseIcon, SlidersIcon } from "./icons";
import { StockFilters } from "./StockFilters";
import { Tween } from "@/components/Tween";
import { useStock } from "./StockShell";
import { accentButton, closeButton, press } from "@/components/ui";


// Below 1024px the filter groups live only in this sheet; from 1024px the sidebar shows them and the sticky bar (and this button) is hidden.
export function FilterSheet() {
  const { query, summary, facets, pending, navigate } = useStock();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // The groups are mounted only while the sheet is open or sliding away, so the page holds one copy of them, not two.
  const [mounted, setMounted] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const applied = appliedFilters(query, facets).length;
  const total = summary?.total;
  // summary only changes when a new result lands, so while pending the button keeps the last known count.
  const label = total === undefined ? "Show Cars" : total === 0 ? "No Cars Match" : total === 1 ? "Show 1 Car" : `Show ${total} Cars`;

  useCloseAtDesktop(() => {
    dialog.current?.close();
    setMounted(false); // the bar is display:none now, so there is no slide-out to wait for
  });
  useEffect(() => () => clearTimeout(unmountTimer.current), []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          clearTimeout(unmountTimer.current);
          setMounted(true);
          dialog.current?.showModal();
        }}
        className={`inline-flex h-12 items-center gap-2 rounded-control border border-control bg-card px-3 text-body font-semibold ${press}`}
      >
        <SlidersIcon className="h-6 w-6" />
        Filters
        {applied > 0 && (
          <span data-testid="filter-badge" className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-meta text-white">
            {applied}
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby={titleId}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        onClose={() => {
          trigger.current?.focus();
          // shortcut: transitionend does not fire (the transitions are cancelled when the dialog goes display:none), so wait out the 320ms slide from globals.css.
          unmountTimer.current = setTimeout(() => setMounted(false), 350);
        }}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-heading font-semibold">
            Filters
          </h2>
          <button type="button" aria-label="Close filters" onClick={() => dialog.current?.close()} className={closeButton}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {mounted && <StockFilters showSearch={false} />}
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {applied > 0 && (
            <button type="button" onClick={() => navigate(clearFilters(query))} className={`min-h-11 text-meta font-semibold underline ${press}`}>
              Clear All Filters
            </button>
          )}
          <button
            type="button"
            disabled={total === 0}
            aria-busy={pending}
            onClick={() => dialog.current?.close()}
            // Dims while the next count loads; the press rule in globals.css eases the dim.
            className={`${accentButton} flex-1 tabular-nums aria-busy:opacity-70 disabled:bg-hairline disabled:text-text-2`}
          >
            <Tween value={label} />
          </button>
        </div>
      </dialog>
    </>
  );
}
