import { createIdStore } from "@/lib/id-store";
import { MAX_SAVED } from "./ids";

export { MAX_SAVED };

export const SAVED_KEY = "carright:saved-ids";
const saved = createIdStore(SAVED_KEY, MAX_SAVED);

export const subscribe = saved.subscribe;
export const useSavedIds = saved.useIds;
export const removeSaved = saved.remove;
// Undo: puts these cars back.
export const restoreSaved = saved.restore;
export const toggleSaved = (id: string): "saved" | "removed" | "full" => {
  const result = saved.toggle(id);
  return result === "added" ? "saved" : result;
};
