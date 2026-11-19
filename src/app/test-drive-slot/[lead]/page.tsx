import type { Metadata } from "next";
import { freeDriveSlot } from "@/app/actions/drives";
import { getDeps } from "@/lib/leads/deps";
import { driveDayLabel, dublinSlot } from "@/lib/leads/constants";
import { verifySlotLink } from "@/lib/leads/photos";
import { stock } from "@/lib/stock";
import { carTitle } from "@/lib/stock/format";
import { accentButton, messagePage, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Free a Test Drive Slot", robots: { index: false, follow: false } };

// The page behind the "Free this slot" link in a test drive email (#166). Opening it changes nothing (email scanners open links): only the
// button, a POST, frees the slot. No login: the signed link is the key. It shows the car and the time, never who asked.
export default async function FreeSlotPage({ params, searchParams }: PageProps<"/test-drive-slot/[lead]">) {
  const { lead } = await params;
  const { exp, sig } = await searchParams;
  const deps = getDeps();
  const valid = await verifySlotLink(lead, exp, sig, deps.photoLinkSecret());
  const hold = valid ? await deps.holds.get(lead) : null;
  const car = hold && (await stock.getById(hold.carId).catch(() => null));
  const [day, time] = hold ? dublinSlot(hold.startsAt.getTime()).split(" ") : [];

  return (
    <main className={messagePage}>
      <h1 className={pageTitle}>{!valid ? "This Link Doesn't Work" : hold ? "Free This Slot?" : "This Slot Is Free"}</h1>
      {!valid ? (
        <p className="mt-4 max-w-[65ch] text-body text-text-2">It has expired, or it was copied wrong. Once a test drive&apos;s time has passed, its slot frees itself.</p>
      ) : hold ? (
        <>
          <p className="mt-4 max-w-[65ch] text-body">
            {car ? carTitle(car) : "This car"}, {driveDayLabel(day, true)} at {time}
          </p>
          <p className="mt-2 max-w-[65ch] text-body text-text-2">Others can then ask for this time. The request itself is kept.</p>
          <form action={freeDriveSlot} className="mt-6">
            <input type="hidden" name="lead" value={lead} />
            <input type="hidden" name="exp" value={String(exp)} />
            <input type="hidden" name="sig" value={String(sig)} />
            <button type="submit" className={accentButton}>
              Free This Slot
            </button>
          </form>
        </>
      ) : (
        <p className="mt-4 max-w-[65ch] text-body text-text-2">Others can ask for this time again.</p>
      )}
    </main>
  );
}
