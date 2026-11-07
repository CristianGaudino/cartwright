import { SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/stock/format";
import type { LeadRow } from "./process";
import { EMPLOYMENT, TIMES } from "./constants";
import { DETAIL_LABELS, TYPE_LABELS } from "./schema";

// The form stores keys and raw numbers; the dealer reads words and formatted figures.
function show(key: string, value: unknown): string {
  const v = String(value);
  if (key === "preferredTime") return TIMES[v as keyof typeof TIMES] ?? v;
  if (key === "employment") return EMPLOYMENT[v as keyof typeof EMPLOYMENT] ?? v;
  if (key === "mileage") return `${Number(v).toLocaleString("en-IE")} km`;
  if (key === "budgetMax" || key === "deposit") return formatPrice(Number(v));
  return v;
}

// Text only, no HTML: nothing the buyer typed can inject markup. The subject is built from server values only (D-02).
// photoPaths are the signed /lead-photos paths for row.photoKeys, made by processLead so this file never sees the secret.
export function buildLeadEmail(row: LeadRow, opts: { demo: boolean; photoPaths?: string[] }): { subject: string; text: string } {
  const subject = `${opts.demo ? "[DEMO] " : ""}${TYPE_LABELS[row.type]}${row.carTitle ? `: ${row.carTitle}` : ""}`;
  const lines = [
    `Name: ${row.name}`,
    row.phone && `Phone: ${row.phone}`,
    row.email && `Email: ${row.email}`,
    ...Object.entries(DETAIL_LABELS).map(([k, label]) => row.details[k] !== undefined && `${label}: ${show(k, row.details[k])}`),
    row.message && `Message:\n${row.message}`,
    row.carTitle && `Car: ${row.carTitle}`,
    row.carPriceEur !== null && `Price: ${formatPrice(row.carPriceEur)}`,
    row.carSlug && `Car page: ${SITE_URL}/used-cars/${row.carSlug}`,
    ...(opts.photoPaths ?? []).map((p, i) => `Photo ${i + 1}: ${SITE_URL}${p}`),
    `Sent from: ${SITE_URL}${row.sourcePath}`,
    `Consent: ${row.consentAt.toISOString()}, version ${row.consentVersion}`,
  ];
  return { subject, text: lines.filter(Boolean).join("\n\n") };
}
