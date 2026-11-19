import { IconBadge, TitleText } from "@/components/Feature";
import { card, pageMain, pageTitle, subTitle } from "@/components/ui";

// `more`: the detail that belongs with a step (what photos to send, say), shown under it, so nothing sits in a column of its own.
export type HowStep = { title: string; text: string; more?: string[] };

// The frame for the form pages: what the page is for, how it works in three steps, then the form in a card. On a phone the steps go
// after the form, under a How It Works heading, so the form starts under the intro. Every form page says something before it asks something.
export function LeadPage({ title, intro, how, children }: { title: string; intro: string; how?: HowStep[]; children: React.ReactNode }) {
  return (
    <main className={`${pageMain} flex flex-col`}>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-2 max-w-[65ch] text-pretty text-body">{intro}</p>
      {how && (
        // Open on the page, not cards: a card reads as something to press, and a chevron here read as a drop-down beside the form's own steps.
        <section aria-labelledby="how-it-works" className="mt-8 max-sm:order-last">
          <h2 id="how-it-works" className={`${subTitle} mb-4 sm:sr-only`}>How It Works</h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
            {how.map((s, i) => (
              <li key={s.title} className="reveal flex gap-4 border-t border-hairline pt-4">
                <IconBadge size="sm">{i + 1}</IconBadge>
                <div className="flex min-w-0 flex-col gap-2">
                  <TitleText title={s.title} text={s.text} />
                  {s.more && (
                    <ul className="flex flex-col gap-2 text-meta">
                      {s.more.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div data-wells className={`mt-8 w-full ${card} p-5 sm:p-6`}>
        {children}
      </div>
    </main>
  );
}
