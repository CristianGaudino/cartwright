"use server";

import { redirect } from "next/navigation";
import { getDeps } from "@/lib/leads/deps";
import { dublinSlot } from "@/lib/leads/constants";
import { verifySlotLink } from "@/lib/leads/photos";
import { ID } from "@/lib/saved/ids";

// The times a car is already held for ("2026-11-25 10:30"), so the test drive form greys them out. Input from anyone: only a car id
// shape is accepted, and only times go back, never who asked. Read-only. A failure answers none: the server still refuses a taken time.
export async function takenDriveTimes(carId: unknown): Promise<string[]> {
  if (typeof carId !== "string" || !ID.test(carId)) return [];
  try {
    return (await getDeps().holds.times(carId, new Date())).map((d) => dublinSlot(d.getTime()));
  } catch {
    return [];
  }
}

// The dealer's "Free this slot" button (POST only: email scanners open links, so the page itself never frees anything). The signature
// is checked again here; only the hold goes, the lead stays. Back to the same page, which then says the slot is free.
export async function freeDriveSlot(fd: FormData): Promise<void> {
  const [lead, exp, sig] = ["lead", "exp", "sig"].map((k) => String(fd.get(k) ?? ""));
  const deps = getDeps();
  if (await verifySlotLink(lead, exp, sig, deps.photoLinkSecret())) await deps.holds.free(lead);
  redirect(`/test-drive-slot/${encodeURIComponent(lead)}?${new URLSearchParams({ exp, sig })}`);
}
