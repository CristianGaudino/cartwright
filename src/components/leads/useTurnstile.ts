"use client";

import { useCallback, useEffect, useRef } from "react";

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
  const started = useRef(false);
  const widget = useRef<string>(undefined);
  const latest = useRef("");
  const waiting = useRef<((t: string) => void)[]>([]);
  const setToken = useCallback((t: string) => {
    latest.current = t;
    if (t) for (const w of waiting.current.splice(0)) w(t);
  }, []);

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
  }, [slot, setToken]);

  // The token, waiting for it if the check has not finished (a quick send, or autofill that never focused a field). After the wait
  // it answers what it has, so the server's "we couldn't check this request" is the worst case, not a send that hangs.
  const ready = useCallback(
    (ms = 8000) => {
      load();
      if (latest.current) return Promise.resolve(latest.current);
      return new Promise<string>((resolve) => {
        const done = (t: string) => {
          clearTimeout(timer);
          resolve(t);
        };
        const timer = setTimeout(() => {
          waiting.current = waiting.current.filter((w) => w !== done);
          resolve(latest.current);
        }, ms);
        waiting.current.push(done);
      });
    },
    [load],
  );

  // Tokens are single use: after a send that may have spent it, ask for a fresh one.
  const reset = useCallback(() => {
    setToken("");
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [setToken]);

  useEffect(
    () => () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
      started.current = false;
    },
    [],
  );

  return { load, ready, reset };
}
