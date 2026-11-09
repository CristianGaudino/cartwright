import { IconBadge, TitleText } from "@/components/Feature";
import { ChevronDownIcon } from "@/components/stock/icons";
import { card, pageMain, pageTitle } from "@/components/ui";

// `more` is what opens under a step when it is tapped: the detail that belongs with that step, so nothing sits in a column of its own.
export type HowStep = { title: string; text: string; more?: string[] };

// The frame for the form pages: what the page is for, how it works in three steps (a step with more to say opens on a tap), then the
// form in a card. Every form page says something before it asks something.
export function LeadPage({ title, intro, how, children }: { title: string; intro: string; how?: HowStep[]; children: React.ReactNode }) {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">{intro}</p>
      {how && (
        <ol className="mt-6 grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          {how.map((s, i) => (
            <li key={s.title} className={`reveal ${card}`}>
              {s.more ? (
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start gap-4 p-4 [&::-webkit-details-marker]:hidden">
                    <IconBadge size="sm">{i + 1}</IconBadge>
                    <TitleText title={s.title} text={s.text} />
                    <ChevronDownIcon className="ml-auto mt-1 size-5 shrink-0 text-text-2 transition-transform duration-150 group-open:rotate-180" />
                  </summary>
                  <ul className="flex flex-col gap-2 px-4 pb-4 pl-[4.5rem] text-meta">
                    {s.more.map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div className="flex gap-4 p-4">
                  <IconBadge size="sm">{i + 1}</IconBadge>
                  <TitleText title={s.title} text={s.text} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <div data-wells className={`mt-8 w-full ${card} p-5 sm:p-6`}>
        {children}
      </div>
    </main>
  );
}
