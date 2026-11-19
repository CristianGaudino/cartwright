"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { takenDriveTimes } from "@/app/actions/drives";
import { LIMITS, driveDayLabel, driveDays, driveTimes } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

const noop = () => () => {};

// A test drive request (#166): a day we are open and a time on it, then contact details. The days depend on today, so they are worked out
// in the browser and the list is empty until the page loads; the server checks the choice again. Times already held for this car are
// greyed out: asked for on each focus inside the picker, so a time taken while the form was open shows once the buyer comes back to it.
export function DriveFields({ bind, carId }: { bind(name: string): FieldBinding; carId: string }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false on the server and first paint, so both match
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const ask = () => takenDriveTimes(carId).then((t) => setTaken(new Set(t)), () => {});
  const day = bind("driveDate");
  const time = bind("driveTime");
  const free = (d: string) => driveTimes(d).filter((t) => !taken.has(`${d} ${t}`));
  const days = mounted ? driveDays().filter((d) => free(d).length > 0) : [];
  const times = driveTimes(day.value).map((t) => ({ value: t, label: t, disabled: taken.has(`${day.value} ${t}`) }));
  // A day gone from the list or a time taken since it was chosen (the list refreshes on focus) is cleared, so the field shows the
  // placeholder honestly and nothing stale is sent.
  const staleDay = mounted && day.value !== "" && !days.includes(day.value);
  const staleTime = time.value !== "" && (staleDay || !free(day.value).includes(time.value));
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
              if (!free(v).includes(time.value)) time.onChange("");
            }}
          />
          <Field {...time} label="Time" required options={[{ value: "", label: day.value ? "Choose a Time" : "Choose a Day First" }, ...times]} />
        </div>
      </div>
      <ContactFields bind={bind} phoneRequired />
      <Field {...bind("message")} label="Anything we should know?" optional multiline maxLength={LIMITS.message} />
    </>
  );
}
