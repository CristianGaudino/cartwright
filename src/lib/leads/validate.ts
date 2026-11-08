import { z } from "zod";
import { leadSchema } from "./schema";
import type { LeadType } from "./schema";

// The server's own rules (schema.ts), run in the browser, so a form says what is wrong as it goes and its words are the server's words.
// Loaded on a form's first use, never with the page: zod is not shipped to a visitor who does not open a form.
// The two hidden fields every lead carries are filled with values that pass, so only what the buyer typed can fail.
export function fieldErrors(type: LeadType, values: Record<string, string>, carId?: string): Record<string, string[]> {
  const raw = { ...values, type, clientRef: crypto.randomUUID(), sourcePath: "/", ...(carId && { carId }) };
  const result = leadSchema.safeParse(raw);
  return result.success ? {} : (z.flattenError(result.error).fieldErrors as Record<string, string[]>);
}
