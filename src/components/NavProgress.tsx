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

  // Starts on a plain left click on a link to another page of this site, the clicks Next turns into a client navigation, and on a
  // search form sent to another page of this site.
  useEffect(() => {
    const go = (to: URL) => {
      if (to.origin !== location.origin || (to.pathname === location.pathname && to.search === location.search)) return;
      setPhase("loading");
    };
    const start = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      go(new URL(a.href));
    };
    // GET forms only (a lead form posts). next/form cancels the submit to navigate itself, so a cancelled submit still counts.
    // On window, so it runs after React's handlers.
    const send = (e: SubmitEvent) => {
      const f = e.target;
      if (!(f instanceof HTMLFormElement) || f.method !== "get" || (f.target && f.target !== "_self")) return;
      const to = new URL(f.action);
      to.search = new URLSearchParams([...new FormData(f, e.submitter)].map(([k, v]) => [k, String(v)])).toString();
      go(to);
    };
    const stop = () => setPhase("idle"); // back and forward have no tap to finish
    document.addEventListener("click", start);
    window.addEventListener("submit", send);
    window.addEventListener("popstate", stop);
    return () => {
      document.removeEventListener("click", start);
      window.removeEventListener("submit", send);
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
