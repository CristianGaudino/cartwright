import { CheckIcon } from "@/components/stock/icons";

// The progress of a stepped form: a numbered dot per step joined by a line, the titles from 640px, and the current step's heading
// (which takes focus when the step changes, so `headingRef` is the form's).
export function Stepper({ titles, step, headingRef }: { titles: string[]; step: number; headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Progress" className="flex items-center gap-2">
        {titles.map((title, i) => (
          <li key={title} aria-current={i === step ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-meta font-semibold ${i < step ? "bg-accent text-white" : i === step ? "bg-text text-ink" : "bg-hairline text-text-2"}`}>
              {i < step ? <CheckIcon className="size-4" /> : i + 1}
            </span>
            <span className={`hidden text-meta sm:block ${i === step ? "font-semibold" : "text-text-2"}`}>{title}</span>
            {i < titles.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${i < step ? "bg-accent" : "bg-hairline"}`} />}
          </li>
        ))}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className="text-heading font-semibold outline-none">
        <span className="text-text-2">
          Step {step + 1} of {titles.length}
        </span>{" "}
        {titles[step]}
      </h2>
    </div>
  );
}
