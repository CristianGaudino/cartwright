"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SITE_SLUG } from "@/lib/site";
import { parseStockQuery, stockHref } from "@/lib/stock/query";
import type { StockQuery } from "@/lib/stock/types";

const KEY = `${SITE_SLUG}:last-list`;
const SCROLL = `${SITE_SLUG}:last-list-scroll`; // { href, y }: where the list was when a card was opened
const RESTORE = `${SITE_SLUG}:restore-scroll`; // set by the Stock link, so only that way back restores the position
const LIST = "/used-cars";
const never = () => () => {};

// Called by the list page. Tab-scoped and read only by BackToCars: the filters never leave the buyer's browser.
export function rememberList(query: StockQuery) {
  try {
    sessionStorage.setItem(KEY, stockHref(query));
  } catch {
    // Storage blocked: the link falls back to the unfiltered list.
  }
}

// A card was opened: remember how far down the list the buyer was.
export function rememberScroll(query: StockQuery) {
  try {
    sessionStorage.setItem(SCROLL, JSON.stringify({ href: stockHref(query), y: Math.round(window.scrollY) }));
  } catch {
    // Storage blocked: the list opens at the top.
  }
}

// The Stock link on a car page was clicked in this tab (not ctrl-clicked into a new one, which would leave this armed).
function armRestore() {
  try {
    sessionStorage.setItem(RESTORE, "1");
  } catch {
    // Storage blocked: the list opens at the top.
  }
}

// The list page, after the Stock link on a car page brought the buyer back: where they were, if it is the same list. Once only.
export function takeScroll(query: StockQuery): number | null {
  try {
    const restore = sessionStorage.getItem(RESTORE);
    sessionStorage.removeItem(RESTORE);
    const saved = JSON.parse(sessionStorage.getItem(SCROLL) ?? "null") as { href?: string; y?: number } | null;
    return restore && saved?.href === stockHref(query) && Number.isFinite(saved.y) ? Math.max(0, saved.y!) : null;
  } catch {
    return null;
  }
}

// Whatever was stored goes back through the query parser, so the href is always the constant path plus serialised, validated params (T-01-14).
function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? stockHref(parseStockQuery(Object.fromEntries(new URL(raw, "http://x").searchParams))) : LIST;
  } catch {
    return LIST;
  }
}

// Server and first paint link to the plain list (works without JavaScript); once hydrated it returns to the list the buyer came from.
export function BackToCars() {
  const href = useSyncExternalStore(never, read, () => LIST);
  return (
    // 44px target; the negative margin keeps the page from moving.
    <Link href={href} onClick={(e) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) && armRestore()} className="-my-2.5 inline-flex min-h-11 items-center text-meta hover:underline">
      Stock
    </Link>
  );
}
