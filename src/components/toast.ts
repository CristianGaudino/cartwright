import { useSyncExternalStore } from "react";

// One message at a time at the bottom of the screen, with an optional Undo, for actions that throw something away: a saved car,
// a car in the compare list. Client-safe like the other stores: nothing here touches window at import time.
export type Toast = { id: number; message: string; undo?: () => void };

let current: Toast | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const set = (t: Toast | null) => {
  current = t;
  listeners.forEach((l) => l());
};

export const showToast = (message: string, undo?: () => void) => set({ id: ++seq, message, undo });
export const dismissToast = () => set(null);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useToast = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
