"use server";

import { headers } from "next/headers";
import { getDeps } from "@/lib/leads/deps";
import { processLead } from "@/lib/leads/process";
import type { LeadResult } from "@/lib/leads/process";

// The one server action for every lead form (D-10). The IP is read for the rate limiter only and never stored.
export async function submitLead(fd: FormData): Promise<LeadResult> {
  try {
    const ip = (await headers()).get("cf-connecting-ip") ?? "";
    return await processLead(fd, { ip }, getDeps());
  } catch {
    return { status: "failed", kind: "server" }; // nothing from the error is logged or returned (D-08)
  }
}
