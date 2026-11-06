"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { parseStockQuery, stockHref } from "@/lib/stock/query";
import type { StockQuery } from "@/lib/stock/types";

const KEY = "cartwright:last-list";
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
    <Link href={href} className="text-body underline">
      Back to used cars
    </Link>
  );
}
