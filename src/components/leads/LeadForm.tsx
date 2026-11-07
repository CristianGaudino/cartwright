"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { submitLead } from "@/app/actions/lead";
import { CheckIcon } from "@/components/stock/icons";
import { PHOTO_TOTAL_ERROR, PHOTO_TOTAL_MAX_BYTES } from "@/lib/leads/constants";
import type { LeadType } from "@/lib/leads/schema";
import type { LeadResult } from "@/lib/leads/process";
import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";
import { ConsentRow } from "./ConsentRow";
import type { CarSummary } from "./LeadDialog";
import { useTurnstile } from "./useTurnstile";

export type FieldBinding = { id: string; name: string; value: string; onChange(v: string): void; error?: string };
export type PhotoBinding = {
  id: string;
  error?: string;
  photos: Blob[];
  onChange: React.Dispatch<React.SetStateAction<Blob[]>>;
  onBusy(busy: boolean): void; // true while picked photos are being shrunk; send waits for them
};
type Failure = Extract<LeadResult, { status: "failed" }>["kind"];

const press = "active:scale-[0.97] motion-reduce:active:scale-100";
// Keys the form sets itself. An error on one of them is not something the buyer can fix, so it reads as a send failure.
const HIDDEN = ["type", "carId", "clientRef", "sourcePath"];

// The shared form shell (D-10, LED-06). Values live in state for the life of the page and the component stays mounted while
// its dialog is closed, so a close or a failed send never loses typed text (research Pattern 2). Submit goes through onSubmit
// and startTransition, never a form action: React resets a form after an action, even one that returned an error.
export function LeadForm({
  type,
  car,
  variant,
  submitLabel,
  success,
  children,
}: {
  type: LeadType;
  car?: CarSummary;
  variant: "dialog" | "page";
  submitLabel: string;
  success: { heading: string; body: string };
  children: (form: { bind(name: string): FieldBinding; photos: PhotoBinding }) => React.ReactNode;
}) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Blob[]>([]); // trade-in only; the shrunk JPEGs, never the originals
  const [shrinking, setShrinking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [summary, setSummary] = useState<{ id: string; message: string }[]>([]);
  const [failure, setFailure] = useState<Failure>();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const clientRef = useRef<string>(undefined); // one per form instance, renewed after a success
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const turnstile = useTurnstile(slot);
  const { load } = turnstile;

  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  // A new array on every failed submit, so focus moves to the summary each time (UI-SPEC Validation).
  useEffect(() => {
    if (summary.length) summaryHeading.current?.focus();
  }, [summary]);

  // Back to a fresh form once the dialog that showed the thanks is closed. The bot check script loads on the first focus
  // inside the dialog (showModal focuses Close) or the form, never on page load.
  useEffect(() => {
    const dialog = form.current?.closest("dialog");
    const root = dialog ?? form.current;
    const reset = () => setDone(false);
    dialog?.addEventListener("close", reset);
    root?.addEventListener("focusin", load);
    return () => {
      dialog?.removeEventListener("close", reset);
      root?.removeEventListener("focusin", load);
    };
  }, [load]);

  const bind = (name: string): FieldBinding => ({
    id: `${uid}-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (v) => setValues((s) => ({ ...s, [name]: v })),
    error: errors[name]?.[0],
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // A backstop: the picker already refuses a photo that would pass the total, and the server checks it again.
    if (photos.reduce((n, p) => n + p.size, 0) > PHOTO_TOTAL_MAX_BYTES) {
      setFailure(undefined);
      setErrors({ photos: [PHOTO_TOTAL_ERROR] });
      setSummary([{ id: `${uid}-photos`, message: PHOTO_TOTAL_ERROR }]);
      return;
    }
    // The DOM is the source here so the honeypot is read as a bot left it.
    const fd = new FormData(e.currentTarget);
    // The file input only adds to the list; what is sent is the shrunk photos in state (T-03-33).
    fd.delete("photos");
    photos.forEach((p, i) => fd.append("photos", p, `photo-${i + 1}.jpg`));
    fd.set("type", type);
    if (car) fd.set("carId", car.id);
    fd.set("sourcePath", location.pathname);
    fd.set("clientRef", (clientRef.current ??= crypto.randomUUID()));
    fd.set("cf-turnstile-response", turnstile.token);
    start(async () => {
      let r: LeadResult;
      try {
        r = await submitLead(fd);
      } catch {
        r = { status: "failed", kind: "server" }; // network, a new deploy, a body the server refused
      }
      // A field error or the rate limit is answered before the token is checked, so only the other answers spend it.
      if (r.status !== "invalid" && !(r.status === "failed" && r.kind === "rate")) turnstile.reset();
      setSummary([]);
      if (r.status === "ok") {
        setValues({});
        setPhotos([]);
        setErrors({});
        setFailure(undefined);
        clientRef.current = undefined;
        setDone(true);
      } else if (r.status === "invalid") {
        const fe = r.fieldErrors;
        setErrors(fe);
        setFailure(Object.keys(fe).some((k) => HIDDEN.includes(k)) ? "server" : undefined);
        // One link per invalid field, in the order the fields sit in the form.
        const names = [...new Set(Array.from(form.current?.elements ?? [], (el) => (el as HTMLInputElement).name))].filter((n) => fe[n]?.[0]);
        setSummary(names.map((n) => ({ id: `${uid}-${n}`, message: fe[n][0] })));
      } else {
        setErrors({});
        setFailure(r.kind);
      }
    });
  }

  const dialog = variant === "dialog";
  const pad = dialog ? "px-4" : "";
  const footer = `flex shrink-0 pt-3 ${dialog ? "border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : ""}`;
  // On a page the body is not its own scroll area, and the button is full width on phones, auto (240px or more) from 640px.
  const body = dialog ? "min-h-0 flex-1 overflow-y-auto overscroll-contain" : "";
  const submitWidth = dialog ? "flex-1" : "w-full px-6 sm:w-auto sm:min-w-60";

  // The form element stays put after a success so the Turnstile slot inside it keeps its widget for the next request.
  return (
    <form ref={form} noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      {done ? (
        <div aria-live="polite" className={`flex flex-col items-start gap-4 py-6 ${pad}`}>
          <span className="flex size-11 items-center justify-center rounded-full bg-text text-ink">
            <CheckIcon />
          </span>
          <h2 ref={heading} tabIndex={-1} className="text-heading font-semibold outline-none">
            {success.heading}
          </h2>
          <p className="max-w-[65ch] text-body">{success.body}</p>
        </div>
      ) : (
        <div className={`flex flex-col gap-6 py-2 ${body} ${pad}`}>
          {/* Fixed copy and our own field messages only: nothing from a thrown error ever shows (T-03-45). */}
          {failure && (
            <div role="alert" className="flex flex-col gap-1 rounded-card border border-hairline p-4">
              {failure === "rate" ? (
                <p className="font-semibold text-destructive">Too many requests. Wait a minute and try again.</p>
              ) : (
                <>
                  <p className="font-semibold text-destructive">{failure === "captcha" ? "We could not check this request." : "We could not send this."}</p>
                  <p className="text-meta">
                    Your details are still here. Try again, or call us on{" "}
                    <a href={`tel:${DEALER_TEL}`} className="font-semibold underline">
                      {DEALER_PHONE}
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          )}
          {summary.length > 0 && (
            <div role="alert" className="flex flex-col gap-2 rounded-card border border-hairline p-4">
              <h3 ref={summaryHeading} tabIndex={-1} className="text-heading font-semibold text-destructive outline-none">
                Check these details
              </h3>
              <ul className="flex flex-col">
                {summary.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(s.id)?.focus();
                      }}
                      className="inline-flex min-h-11 items-center underline"
                    >
                      {s.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {car && (
            <div className="flex items-center gap-3">
              <div className="h-[60px] w-20 shrink-0 overflow-hidden rounded-control bg-photo-bg">
                {car.photo && <Image src={car.photo} width={80} height={60} alt="" loading="lazy" className="size-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">{car.title}</p>
                <p className="text-meta text-text-2">{car.price}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4">{children({ bind, photos: { id: `${uid}-photos`, error: errors.photos?.[0], photos, onChange: setPhotos, onBusy: setShrinking } })}</div>
          <ConsentRow {...bind("consent")} />
          {/* Honeypot (D-05): off-screen, not display:none, so bots fill it and people never meet it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
        </div>
      )}
      {/* Turnstile slot: zero height until Cloudflare shows a challenge (03-01: 0px, 71px with one). */}
      <div ref={slot} className={`shrink-0 ${pad}`} />
      {done ? (
        dialog ? (
          <div className={`mt-auto ${footer}`}>
            <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} className={`h-12 flex-1 rounded-control border border-control bg-card font-semibold ${press}`}>
              Close
            </button>
          </div>
        ) : (
          <div className={footer}>
            <Link href="/used-cars" className={`inline-flex h-12 items-center justify-center rounded-control border border-control bg-card px-6 font-semibold ${press}`}>
              Back to used cars
            </Link>
          </div>
        )
      ) : (
        <div className={footer}>
          <button type="submit" disabled={pending || shrinking} aria-busy={pending || shrinking} className={`h-12 ${submitWidth} rounded-control bg-accent font-semibold text-white disabled:opacity-60 ${press}`}>
            {pending ? "Sending" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
