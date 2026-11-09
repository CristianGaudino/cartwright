"use client";

import { DEV_COOKIE, DEV_MODES, type DevMode } from "@/lib/dev-modes";

// break-ui: Demo / Worst case, dev only (mounted in layout.tsx behind NODE_ENV). Plain on purpose: it is chrome, not the design under test.
const LABELS = { demo: "Demo data", worst: "Worst case", empty: "Empty", one: "One", huge: "1,284 cars" } as const;

export function DevDataToggle({ mode }: { mode: DevMode }) {
  return (
    <div data-dev-toggle role="group" aria-label="Data" className="fixed bottom-1 left-1/2 z-100 flex -translate-x-1/2 gap-0.5 rounded-lg bg-neutral-300 p-0.5 font-sans text-xs text-black shadow">
      {DEV_MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === mode}
          onClick={() => {
            document.cookie = `${DEV_COOKIE}=${m}; path=/; max-age=86400; samesite=lax`;
            location.reload();
          }}
          className={`rounded-md px-2 py-1 ${m === mode ? "bg-white shadow-sm" : ""}`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
