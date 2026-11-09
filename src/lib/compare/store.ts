import { createIdStore } from "@/lib/id-store";
import { SITE_SLUG } from "@/lib/site";

// Up to three cars side by side (the mockup's compare page), kept in this browser like the saved cars.
export const MAX_COMPARE = 3;
const compare = createIdStore(`${SITE_SLUG}:compare-ids`, MAX_COMPARE);

export const useCompareIds = compare.useIds;
export const removeCompare = compare.remove;
export const clearCompare = () => compare.set([]);
// Undo: puts these cars back.
export const restoreCompare = compare.restore;
export const toggleCompare = (id: string): "added" | "removed" | "full" => compare.toggle(id);
