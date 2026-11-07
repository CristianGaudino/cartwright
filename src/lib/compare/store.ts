import { createIdStore } from "@/lib/id-store";

// Up to three cars side by side (the mockup's compare page), kept in this browser like the saved cars.
export const MAX_COMPARE = 3;
const compare = createIdStore("carright:compare-ids", MAX_COMPARE);

export const useCompareIds = compare.useIds;
export const removeCompare = compare.remove;
export const clearCompare = () => compare.set([]);
export const toggleCompare = (id: string): "added" | "removed" | "full" => compare.toggle(id);
