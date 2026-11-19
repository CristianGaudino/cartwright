"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Phase = "idle" | "loading" | "done";

// A thin bar along the top while a tapped page loads. Most pages here are drawn per request, and Next does not prefetch those, so on a
// slow phone a tap could seem to do nothing. Not loading.tsx: a page that streams answers 200 even when it ends in notFound(), and a sold
// or unknown car must stay a 404. The CSS (.nav-progress) waits 150ms, so a quick page never shows it.
export function NavProgress() {
  const url = `${usePathname()}?${useSearchParams()}`;
  const [phase, setPhase] = useState<Phase>("idle");

  // Starts on a plain left click on a link to another page of this site, the clicks Next turns into a client navigation.
  useEffect(() => {
    const start = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = new URL(a.href);
      if (to.origin !== location.origin || (to.pathname === location.pathname && to.search === location.search)) return;
      setPhase("loading");
    };
    const stop = () => setPhase("idle"); // back and forward have no tap to finish
    document.addEventListener("click", start);
    window.addEventListener("popstate", stop);
    return () => {
      document.removeEventListener("click", start);
      window.removeEventListener("popstate", stop);
    };
  }, []);

  // The new page is on screen: run the bar out and fade it.
  useEffect(() => {
    setPhase((p) => (p === "loading" ? "done" : p)); // eslint-disable-line react-hooks/set-state-in-effect -- the URL is the outside signal
  }, [url]);

  // After the fade, back to empty. A tap that never became a page (a redirect back to here) gives up after 15s.
  useEffect(() => {
    if (phase === "idle") return;
    const t = setTimeout(() => setPhase("idle"), phase === "done" ? 300 : 15_000);
    return () => clearTimeout(t);
  }, [phase]);

  return <div aria-hidden="true" data-phase={phase} className="nav-progress" />;
}
