"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ShareIcon } from "@/components/stock/icons";

type Mode = "link" | "native" | "menu";
type Copy = "idle" | "copied" | "failed";

const never = () => () => {};
const clientMode = (): Mode => (typeof navigator.share === "function" ? "native" : "menu");
const serverMode = (): Mode => "link";

const look =
  "inline-flex h-11 items-center gap-2 rounded-control border border-control bg-card px-4 max-[359px]:px-3 text-body font-semibold text-text active:scale-[0.97] motion-reduce:active:scale-100";
const item = "flex h-11 w-full items-center rounded-control px-3 text-left text-body font-semibold text-text hover:bg-hairline";

// title, text and url come from the server (canonical URL, never the current address), so the buyer's query string never leaves the site.
// Server and first paint render a plain WhatsApp link (works without JavaScript); once hydrated it becomes the native sheet where the browser has one, else a two-item menu.
export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const base = useSyncExternalStore(never, clientMode, serverMode);
  const [fellBack, setFellBack] = useState(false);
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<Copy>("idle");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelId = useId();
  const mode: Mode = base === "native" && fellBack ? "menu" : base;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}. ${url}`)}`;

  const close = useCallback((refocus = true) => {
    clearTimeout(timer.current);
    setOpen(false);
    setCopy("idle");
    if (refocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (mode === "link") {
    return (
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={look}>
        <ShareIcon />
        <span className="max-[359px]:sr-only">Share</span>
      </a>
    );
  }

  async function share() {
    try {
      await navigator.share({ title, text, url });
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setFellBack(true);
      setOpen(true);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
      timer.current = setTimeout(() => close(), 2000);
    } catch {
      setCopy("failed");
    }
  }

  if (mode === "native") {
    return (
      <button type="button" onClick={share} className={look}>
        <ShareIcon />
        <span className="max-[359px]:sr-only">Share</span>
      </button>
    );
  }

  return (
    <div ref={root} className="relative">
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => (open ? close() : setOpen(true))} className={look}>
        <ShareIcon />
        <span className="max-[359px]:sr-only">Share</span>
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-10 mt-2 flex w-max min-w-52 flex-col rounded-card border border-hairline bg-card p-2 shadow-lift transition duration-150 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0"
        >
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => close()} className={item}>
            Share on WhatsApp
          </a>
          <button type="button" onClick={copyLink} className={item}>
            <span aria-live="polite">{copy === "copied" ? "Link copied" : copy === "failed" ? "Could not copy the link" : "Copy link"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
