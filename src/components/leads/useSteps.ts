import { useEffect, useRef, useState } from "react";

// A stepped form: the fields each step owns, and an optional extra check for what is not a typed field (the photos). The typed fields are
// checked with the server's own rules (validate.ts).
export type FormStep = { title: string; fields: string[]; check?(ctx: { photos: number }): Record<string, string[]> | undefined };

// The step a stepped form is on, and how to move. One step or none is an ordinary form (`wizard` false, `last` true).
// `validate` says what is wrong with a step; Next only moves on when nothing is. `onBlocked` hears the problems when Next is refused, with the
// names of the fields that have one, in order; `onPassed` hears the step that was left clean.
export function useSteps(
  steps: FormStep[] | undefined,
  validate: (step: FormStep) => Promise<Record<string, string[]>>,
  onBlocked: (found: Record<string, string[]>, names: string[]) => void,
  onPassed: (step: FormStep) => void,
) {
  const [step, setStep] = useState(0);
  const [moves, setMoves] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const wizard = steps !== undefined && steps.length > 1;
  const last = !wizard || step === steps.length - 1;

  // A new step takes focus on its heading, so a screen reader hears where it is and the page is not left scrolled past it. Not if the
  // buyer has already started typing in a field of the new step: focus is never taken from a field.
  useEffect(() => {
    if (moves && !(document.activeElement instanceof HTMLElement && document.activeElement.matches("input, textarea, select"))) heading.current?.focus();
  }, [moves]);

  const go = (to: number) => {
    setStep(to);
    setMoves((n) => n + 1);
  };
  const next = async () => {
    const s = steps?.[step];
    if (!s) return;
    const found = await validate(s);
    if (Object.keys(found).length) {
      onBlocked(found, s.fields.filter((n) => found[n]));
      return;
    }
    onPassed(s);
    go(step + 1);
  };
  // The earliest step with a problem in `errors` (the server's answer), or -1.
  const firstWith = (errors: Record<string, string[]>) => steps?.findIndex((s) => s.fields.some((f) => errors[f]?.[0])) ?? -1;

  return { step, setStep, wizard, last, heading, go, next, firstWith };
}
