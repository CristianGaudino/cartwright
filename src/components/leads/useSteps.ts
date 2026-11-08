import { useEffect, useRef, useState } from "react";

// A stepped form: the fields each step owns, and an optional check run before Next (the server still checks everything at the end).
export type FormStep = { title: string; fields: string[]; check?(values: Record<string, string>): Record<string, string[]> | undefined };

// The step a stepped form is on, and how to move. One step or none is an ordinary form (`wizard` false, `last` true).
// `onBlocked` hears the problems when Next is refused, with the names of the fields that have one, in order.
export function useSteps(steps: FormStep[] | undefined, values: Record<string, string>, onBlocked: (found: Record<string, string[]>, names: string[]) => void) {
  const [step, setStep] = useState(0);
  const [moves, setMoves] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const wizard = steps !== undefined && steps.length > 1;
  const last = !wizard || step === steps.length - 1;

  // A new step takes focus on its heading, so a screen reader hears where it is and the page is not left scrolled past it.
  useEffect(() => {
    if (moves) heading.current?.focus();
  }, [moves]);

  const go = (to: number) => {
    setStep(to);
    setMoves((n) => n + 1);
  };
  const next = () => {
    const found = steps?.[step].check?.(values);
    if (found && Object.keys(found).length) {
      onBlocked(found, steps![step].fields.filter((n) => found[n]));
      return;
    }
    go(step + 1);
  };
  // The earliest step with a problem in `errors` (the server's answer), or -1.
  const firstWith = (errors: Record<string, string[]>) => steps?.findIndex((s) => s.fields.some((f) => errors[f]?.[0])) ?? -1;

  return { step, setStep, wizard, last, heading, go, next, firstWith };
}
