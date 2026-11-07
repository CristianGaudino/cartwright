"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// developers.cloudflare.com/turnstile/get-started/client-side-rendering/
type Turnstile = {
  render(el: HTMLElement, opts: Record<string, unknown>): string | undefined;
  reset(id: string): void;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let script: Promise<void> | undefined; // once per page, shared by every form

function loadScript(): Promise<void> {
  return (script ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      script = undefined; // let the next focus try again
      s.remove();
      reject();
    };
    document.head.append(s);
  }));
}

// The bot check (D-05): a Managed widget with interaction-only appearance, invisible unless Cloudflare needs a challenge.
// load() is called on the form's first open or focus, never on page load (mobile performance).
export function useTurnstile(slot: React.RefObject<HTMLDivElement | null>) {
  const [token, setToken] = useState("");
  const started = useRef(false);
  const widget = useRef<string>(undefined);

  const load = useCallback(() => {
    if (started.current) return;
    started.current = true;
    loadScript().then(
      () => {
        if (!slot.current || !window.turnstile || !started.current) return;
        widget.current = window.turnstile.render(slot.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          action: "lead",
          appearance: "interaction-only",
          execution: "render",
          callback: (t: string) => setToken(t),
          "error-callback": () => setToken(""),
          "expired-callback": () => setToken(""),
        });
      },
      () => {
        started.current = false;
      },
    );
  }, [slot]);

  // Tokens are single use: after a send that may have spent it, ask for a fresh one.
  const reset = useCallback(() => {
    setToken("");
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  useEffect(
    () => () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
      started.current = false;
    },
    [],
  );

  return { token, load, reset };
}
