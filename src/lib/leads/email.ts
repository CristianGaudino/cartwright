import { SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/stock/format";
import type { LeadRow } from "./process";
import { EMPLOYMENT, driveDayLabel } from "./constants";
import { DETAIL_LABELS, TYPE_LABELS } from "./schema";

// The form stores keys and raw numbers; the dealer reads words and formatted figures.
function show(key: string, value: unknown): string {
  const v = String(value);
  if (key === "employment") return EMPLOYMENT[v as keyof typeof EMPLOYMENT] ?? v;
  if (key === "mileage") return `${Number(v).toLocaleString("en-IE")} km`;
  if (key === "budgetMax" || key === "deposit") return formatPrice(Number(v));
  if (key === "driveDate") return driveDayLabel(v, true);
  return v;
}

// Text only, no HTML: nothing the buyer typed can inject markup. The subject is built from server values only (D-02).
// photoPaths are the signed /lead-photos paths for row.photoKeys, and slotPath a test drive's signed "Free this slot" path, made by
// processLead so this file never sees the secret. A test drive's day and time are in the subject: they are checked against the slot grid.
export function buildLeadEmail(row: LeadRow, opts: { demo: boolean; photoPaths?: string[]; slotPath?: string }): { subject: string; text: string } {
  const { driveDate, driveTime } = row.details;
  const when = row.type === "test_drive" ? `, ${driveDayLabel(String(driveDate))} at ${driveTime}` : "";
  const subject = `${opts.demo ? "[DEMO] " : ""}${TYPE_LABELS[row.type]}${when}${row.carTitle ? `: ${row.carTitle}` : ""}`;
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
    opts.slotPath && `Call to confirm. If the time can't go ahead, free it for others: ${SITE_URL}${opts.slotPath}`,
    `Sent from: ${SITE_URL}${row.sourcePath}`,
    `Consent: ${row.consentAt.toISOString()}, version ${row.consentVersion}`,
  ];
  return { subject, text: lines.filter(Boolean).join("\n\n") };
}
