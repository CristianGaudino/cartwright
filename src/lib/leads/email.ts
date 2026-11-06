import { SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/stock/format";
import type { LeadRow } from "./process";
import { DETAIL_LABELS, TYPE_LABELS } from "./schema";

// Text only, no HTML: nothing the buyer typed can inject markup. The subject is built from server values only (D-02).
export function buildLeadEmail(row: LeadRow, opts: { demo: boolean }): { subject: string; text: string } {
  const subject = `${opts.demo ? "[DEMO] " : ""}${TYPE_LABELS[row.type]}${row.carTitle ? `: ${row.carTitle}` : ""}`;
  const lines = [
    `Name: ${row.name}`,
    row.phone && `Phone: ${row.phone}`,
    row.email && `Email: ${row.email}`,
    ...Object.entries(DETAIL_LABELS).map(([k, label]) => row.details[k] !== undefined && `${label}: ${row.details[k]}`),
    row.message && `Message:\n${row.message}`,
    row.carTitle && `Car: ${row.carTitle}`,
    row.carPriceEur !== null && `Price: ${formatPrice(row.carPriceEur)}`,
    row.carSlug && `Car page: ${SITE_URL}/used-cars/${row.carSlug}`,
    `Sent from: ${SITE_URL}${row.sourcePath}`,
    `Consent: ${row.consentAt.toISOString()}, version ${row.consentVersion}`,
  ];
  return { subject, text: lines.filter(Boolean).join("\n\n") };
}
