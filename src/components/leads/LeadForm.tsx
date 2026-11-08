"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { submitLead } from "@/app/actions/lead";
import { CheckIcon } from "@/components/stock/icons";
import { PHOTO_TOTAL_ERROR, PHOTO_TOTAL_MAX_BYTES } from "@/lib/leads/constants";
import type { LeadType } from "@/lib/leads/schema";
import type { LeadResult } from "@/lib/leads/process";
import { ConsentRow } from "./ConsentRow";
import { Stepper } from "./Stepper";
import type { CarSummary } from "./LeadDialog";
import { useTurnstile } from "./useTurnstile";
import { accentButton, secondaryButton } from "@/components/ui";
import { PhoneLink } from "@/components/PhoneLink";

export type FieldBinding = { id: string; name: string; value: string; onChange(v: string): void; error?: string };
export type PhotoBinding = {
  id: string;
  error?: string;
  photos: Blob[];
  onChange: React.Dispatch<React.SetStateAction<Blob[]>>;
  onBusy(busy: boolean): void; // true while picked photos are being shrunk; send waits for them
};
type Failure = Extract<LeadResult, { status: "failed" }>["kind"];
// A stepped form: the fields each step owns, and an optional check run before Next (the server still checks everything at the end).
export type FormStep = { title: string; fields: string[]; check?(values: Record<string, string>): Record<string, string[]> | undefined };

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
  back = { href: "/used-cars", label: "Back to Used Cars" },
  prefill,
  steps,
  children,
}: {
  type: LeadType;
  car?: CarSummary;
  variant: "dialog" | "page";
  submitLabel: string;
  success: { heading: string; body: string };
  back?: { href: string; label: string }; // where the page variant's success button goes
  prefill?: Record<string, string>; // a new object overwrites those fields and keeps the rest (the calculator's deposit and term)
  steps?: FormStep[]; // more than one: guided stages with Back and Next, every step's fields kept in the form
  children: (form: { bind(name: string): FieldBinding; photos: PhotoBinding; step: number }) => React.ReactNode;
}) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(prefill ?? {});
  const [prefilled, setPrefilled] = useState(prefill);
  if (prefill !== prefilled) {
    setPrefilled(prefill);
    setValues((s) => ({ ...s, ...prefill }));
  }
  const [photos, setPhotos] = useState<Blob[]>([]); // trade-in only; the shrunk JPEGs, never the originals
  const [shrinking, setShrinking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  // How many fields need a look and which one comes first: a new object on each failed send, so focus moves each time.
  const [invalid, setInvalid] = useState<{ count: number; first: string }>();
  const [failure, setFailure] = useState<Failure>();
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const wizard = steps !== undefined && steps.length > 1;
  const last = !wizard || step === steps.length - 1;
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const clientRef = useRef<string>(undefined); // one per form instance, renewed after a success
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const turnstile = useTurnstile(slot);
  const { load } = turnstile;

  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  // A new step takes focus on its heading, so a screen reader hears where it is and the page is not left scrolled past it.
  const [focusStep, setFocusStep] = useState(0);
  useEffect(() => {
    if (focusStep) stepHeading.current?.focus({ preventScroll: false });
  }, [focusStep]);
  const go = (to: number) => {
    setStep(to);
    setFocusStep((n) => n + 1);
  };
  const next = () => {
    const found = steps?.[step].check?.(values);
    if (found && Object.keys(found).length) {
      setErrors((prev) => ({ ...prev, ...found }));
      const names = steps![step].fields.filter((n) => found[n]);
      setInvalid({ count: names.length, first: `${uid}-${names[0]}` });
      return;
    }
    setInvalid(undefined);
    go(step + 1);
  };

  // On a failed send the first field to fix takes focus (a screen reader reads its error with it), and the slim note above says how many.
  useEffect(() => {
    if (invalid) document.getElementById(invalid.first)?.focus();
  }, [invalid]);

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
    if (!last) return next(); // Enter in a field moves on, it does not send half a form
    // A backstop: the picker already refuses a photo that would pass the total, and the server checks it again.
    if (photos.reduce((n, p) => n + p.size, 0) > PHOTO_TOTAL_MAX_BYTES) {
      setFailure(undefined);
      setErrors({ photos: [PHOTO_TOTAL_ERROR] });
      setInvalid({ count: 1, first: `${uid}-photos` });
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
      setInvalid(undefined);
      if (r.status === "ok") {
        setValues({});
        setStep(0);
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
        if (names.length) setInvalid({ count: names.length, first: `${uid}-${names[0]}` });
        // Back to the earliest step that has something to fix.
        const at = steps?.findIndex((s) => s.fields.some((f) => fe[f]?.[0])) ?? -1;
        if (at >= 0) setStep(at);
      } else {
        setErrors({});
        setFailure(r.kind);
        // A server failure may be an email that did not go out: a retry must be stored and sent again, not answered as a duplicate.
        if (r.kind === "server") clientRef.current = undefined;
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
    <form
      ref={form}
      noValidate
      onSubmit={onSubmit}
      // With no submit button on a step, Enter in a field would do nothing at all: it moves to the next step instead.
      onKeyDown={(e) => {
        if (!last && e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "file" && e.target.type !== "checkbox") {
          e.preventDefault();
          next();
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
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
        <div className={`relative flex flex-col gap-6 py-2 ${body} ${pad}`}>
          {wizard && <Stepper titles={steps.map((s) => s.title)} step={step} headingRef={stepHeading} />}
          {car && (
            <div className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-3">
              <div className="h-[60px] w-20 shrink-0 overflow-hidden rounded-control bg-photo-bg">
                {car.photo && <Image src={car.photo} width={80} height={60} alt="" loading="lazy" className="size-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">{car.title}</p>
                <p className="text-meta text-text-2">{car.price}</p>
              </div>
            </div>
          )}
          {/* Fixed copy and our own field messages only: nothing from a thrown error ever shows (T-03-45). */}
          {failure && (
            <div role="alert" className="flex flex-col gap-1 rounded-card border border-hairline p-4">
              {failure === "rate" ? (
                <p className="font-semibold text-destructive">Too many requests. Wait a minute and try again.</p>
              ) : failure === "gone" ? (
                <>
                  <p className="font-semibold text-destructive">This car has just been sold.</p>
                  <p className="text-meta">
                    <Link href="/used-cars" className="font-semibold underline">
                      See the Cars We Have
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-destructive">{failure === "captcha" ? "We could not check this request." : "We could not send this."}</p>
                  <p className="text-meta">
                    Your details are still here. Try again, or call us on{" "}
                    <PhoneLink />.
                  </p>
                </>
              )}
            </div>
          )}
          {invalid && (
            <p role="alert" className="flex items-center gap-2 rounded-control bg-destructive/10 px-3 py-2.5 text-meta font-semibold text-destructive">
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-ink">
                !
              </span>
              {invalid.count === 1 ? "One field needs a look." : `${invalid.count} fields need a look.`}
            </p>
          )}
          <div className="flex flex-col gap-4">{children({ bind, step, photos: { id: `${uid}-photos`, error: errors.photos?.[0], photos, onChange: setPhotos, onBusy: setShrinking } })}</div>
          <div hidden={!last}>
            <ConsentRow {...bind("consent")} />
          </div>
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
            <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} className={`h-12 flex-1 ${secondaryButton}`}>
              Close
            </button>
          </div>
        ) : (
          <div className={footer}>
            <Link href={back.href} className={`inline-flex h-12 items-center justify-center px-6 ${secondaryButton}`}>
              {back.label}
            </Link>
          </div>
        )
      ) : (
        <div className={`${footer} gap-3`}>
          {wizard && step > 0 && (
            <button type="button" onClick={() => go(step - 1)} className={`h-12 px-6 ${secondaryButton}`}>
              Back
            </button>
          )}
          {last ? (
            <button type="submit" disabled={pending || shrinking} aria-busy={pending || shrinking} className={`${accentButton} ${wizard ? "flex-1 sm:flex-none sm:min-w-60" : submitWidth} disabled:opacity-60`}>
              {pending ? "Sending" : submitLabel}
            </button>
          ) : (
            <button type="button" onClick={next} className={`${accentButton} flex-1 sm:flex-none sm:min-w-60`}>
              Next
            </button>
          )}
        </div>
      )}
    </form>
  );
}
