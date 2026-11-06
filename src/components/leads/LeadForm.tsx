"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { submitLead } from "@/app/actions/lead";
import { CheckIcon } from "@/components/stock/icons";
import { CONSENT } from "@/lib/leads/schema";
import type { LeadType } from "@/lib/leads/schema";
import type { LeadResult } from "@/lib/leads/process";
import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";
import type { CarSummary } from "./LeadDialog";

export type FieldBinding = { id: string; name: string; value: string; onChange(v: string): void; error?: string };
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
  children: (form: { bind(name: string): FieldBinding }) => React.ReactNode;
}) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<Failure>();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const clientRef = useRef<string>(undefined); // one per form instance, renewed after a success
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  // Back to a fresh form once the dialog that showed the thanks is closed.
  useEffect(() => {
    const dialog = form.current?.closest("dialog");
    const reset = () => setDone(false);
    dialog?.addEventListener("close", reset);
    return () => dialog?.removeEventListener("close", reset);
  }, []);

  const bind = (name: string): FieldBinding => ({
    id: `${uid}-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (v) => setValues((s) => ({ ...s, [name]: v })),
    error: errors[name]?.[0],
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The DOM is the source here so the honeypot is read as a bot left it.
    const fd = new FormData(e.currentTarget);
    fd.set("type", type);
    if (car) fd.set("carId", car.id);
    fd.set("sourcePath", location.pathname);
    fd.set("clientRef", (clientRef.current ??= crypto.randomUUID()));
    start(async () => {
      let r: LeadResult;
      try {
        r = await submitLead(fd);
      } catch {
        r = { status: "failed", kind: "server" }; // network, a new deploy, a body the server refused
      }
      if (r.status === "ok") {
        setValues({});
        setConsent(false);
        setErrors({});
        setFailure(undefined);
        clientRef.current = undefined;
        setDone(true);
      } else if (r.status === "invalid") {
        setErrors(r.fieldErrors);
        setFailure(Object.keys(r.fieldErrors).some((k) => HIDDEN.includes(k)) ? "server" : undefined);
      } else {
        setErrors({});
        setFailure(r.kind);
      }
    });
  }

  const pad = variant === "dialog" ? "px-4" : "";

  if (done) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div aria-live="polite" className={`flex flex-col items-start gap-4 py-6 ${pad}`}>
          <span className="flex size-11 items-center justify-center rounded-full bg-text text-ink">
            <CheckIcon />
          </span>
          <h2 ref={heading} tabIndex={-1} className="text-heading font-semibold outline-none">
            {success.heading}
          </h2>
          <p className="max-w-[65ch] text-body">{success.body}</p>
        </div>
        {variant === "dialog" ? (
          <div className="mt-auto flex shrink-0 border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} className={`h-12 flex-1 rounded-control border border-control bg-card font-semibold ${press}`}>
              Close
            </button>
          </div>
        ) : (
          <Link href="/used-cars" className="font-semibold underline">
            Back to used cars
          </Link>
        )}
      </div>
    );
  }

  const consentId = `${uid}-consent`;
  const consentError = errors.consent?.[0];

  return (
    <form ref={form} noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain py-2 ${pad}`}>
        {failure && (
          <div role="alert" className="rounded-card border border-hairline p-4 text-meta">
            {failure === "rate" ? (
              <p className="font-semibold text-destructive">Too many requests. Wait a minute and try again.</p>
            ) : (
              <p>
                <span className="font-semibold text-destructive">{failure === "captcha" ? "We could not check this request." : "We could not send this."}</span> Your details
                are still here. Try again, or call us on{" "}
                <a href={`tel:${DEALER_TEL}`} className="font-semibold underline">
                  {DEALER_PHONE}
                </a>
                .
              </p>
            )}
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
        <div className="flex flex-col gap-4">{children({ bind })}</div>
        <div className="flex flex-col gap-1">
          <div className="flex min-h-11 items-start gap-3 py-1">
            <input
              id={consentId}
              type="checkbox"
              name="consent"
              value="yes"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? `${consentId}-error` : undefined}
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <label htmlFor={consentId} className="text-meta">
              {CONSENT.text}{" "}
              <a href="/privacy" target="_blank" rel="noopener" className="underline">
                Privacy policy<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </label>
          </div>
          {consentError && (
            <p id={`${consentId}-error`} className="text-meta text-destructive">
              {consentError}
            </p>
          )}
        </div>
        {/* Honeypot (D-05): off-screen, not display:none, so bots fill it and people never meet it. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
      </div>
      <div className={`flex shrink-0 pt-3 ${variant === "dialog" ? "border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : ""}`}>
        <button type="submit" disabled={pending} aria-busy={pending} className={`h-12 flex-1 rounded-control bg-accent font-semibold text-white disabled:opacity-60 ${press}`}>
          {pending ? "Sending" : submitLabel}
        </button>
      </div>
    </form>
  );
}

const input = "h-12 w-full rounded-control border border-control bg-surface px-4 text-body aria-[invalid=true]:border-destructive";

// A labelled text input or textarea bound to the form. 03-09 replaces it with the shared Field set.
export function TextField({
  field,
  label,
  optional,
  multiline,
  ...rest
}: { field: FieldBinding; label: string; optional?: boolean; multiline?: boolean } & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "autoComplete" | "maxLength" | "enterKeyHint" | "inputMode"
>) {
  const err = field.error ? `${field.id}-error` : undefined;
  const common = { id: field.id, name: field.name, value: field.value, "aria-invalid": field.error ? true : undefined, "aria-describedby": err };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.id} className="text-meta font-semibold">
        {label}
        {optional && <span className="font-normal text-text-2"> (optional)</span>}
      </label>
      {multiline ? (
        <textarea {...common} maxLength={rest.maxLength} enterKeyHint="enter" onChange={(e) => field.onChange(e.target.value)} className={`${input} min-h-28 resize-none py-3`} />
      ) : (
        <input {...common} {...rest} onChange={(e) => field.onChange(e.target.value)} className={input} />
      )}
      {field.error && (
        <p id={err} className="text-meta text-destructive">
          {field.error}
        </p>
      )}
    </div>
  );
}
