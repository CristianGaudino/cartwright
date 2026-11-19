"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { takenDriveTimes } from "@/app/actions/drives";
import { LIMITS, driveDayLabel, driveDays, driveTimes, isDriveDay, openDriveTimes } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

const noop = () => () => {};

// A test drive request (#166): a day we are open and a time on it at least an hour away, then contact details. The days and times depend
// on now, so they are worked out in the browser and the lists are empty until the page loads; the server checks the choice again. Times
// already held for this car are greyed out: asked for on each focus inside the picker, so a time taken while the form was open shows once
// the buyer comes back to it.
export function DriveFields({ bind, carId }: { bind(name: string): FieldBinding; carId: string }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false on the server and first paint, so both match
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const ask = () => takenDriveTimes(carId).then((t) => setTaken(new Set(t)), () => {});
  const day = bind("driveDate");
  const time = bind("driveTime");
  const open = (d: string) => openDriveTimes(d).filter((t) => !taken.has(`${d} ${t}`)); // what a new choice may be: free and an hour away
  // A chosen time that has since become too soon stays chosen (and listed, greyed out), so the send says why under Time rather than the
  // field emptying itself. Only a time gone from the grid or taken by someone else is cleared.
  const onGrid = (d: string, t: string) => driveTimes(d).includes(t) && !taken.has(`${d} ${t}`);
  const keptDay = mounted && day.value !== "" && time.value !== "" && isDriveDay(day.value) && onGrid(day.value, time.value);
  const offered = mounted ? driveDays().filter((d) => open(d).length > 0) : [];
  const days = keptDay && !offered.includes(day.value) ? [day.value, ...offered] : offered; // only today drops out, so it goes first
  const fresh = mounted ? openDriveTimes(day.value) : [];
  const times = (mounted ? driveTimes(day.value) : [])
    .filter((t) => fresh.includes(t) || t === time.value)
    .map((t) => ({ value: t, label: t, disabled: taken.has(`${day.value} ${t}`) || !fresh.includes(t) }));
  // A day gone from the list or a time taken since it was chosen (the list refreshes on focus) is cleared, so the field shows the
  // placeholder honestly and nothing stale is sent.
  const staleDay = mounted && day.value !== "" && !days.includes(day.value);
  const staleTime = mounted && time.value !== "" && (staleDay || !onGrid(day.value, time.value));
  useEffect(() => {
    if (staleDay) day.onChange("");
    if (staleTime) time.onChange("");
  }, [staleDay, staleTime, day, time]);
  return (
    <>
      <div className="@container" onFocus={ask}>
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
          <Field
            {...day}
            label="Day"
            required
            options={[{ value: "", label: "Choose a Day" }, ...days.map((d) => ({ value: d, label: driveDayLabel(d) }))]}
            onChange={(v) => {
              day.onChange(v);
              if (!open(v).includes(time.value)) time.onChange("");
            }}
          />
          <Field {...time} label="Time" required helper="Irish time" options={[{ value: "", label: day.value ? "Choose a Time" : "Choose a Day First" }, ...times]} />
        </div>
      </div>
      <ContactFields bind={bind} phoneRequired />
      <Field {...bind("message")} label="Anything we should know?" optional multiline maxLength={LIMITS.message} />
    </>
  );
}
