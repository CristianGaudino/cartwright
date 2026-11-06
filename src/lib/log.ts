import type { Outcome } from "@/lib/leads/process";
import type { LeadType } from "@/lib/leads/schema";

// The only logger in the lead path. It takes the three allowed keys and builds the line from them by name, so nothing
// else can reach Workers Logs (D-08). Unsent and failed leads go out at error level so they stand out.
export function logLead({ leadId, type, outcome }: { leadId?: string; type: LeadType | "n/a"; outcome: Outcome }): void {
  const line = JSON.stringify({ leadId, type, outcome });
  if (outcome === "error" || outcome === "notify_failed") console.error(line);
  else console.log(line);
}
