import { IconBadge, TitleText } from "@/components/Feature";
import { card, pageMain, pageTitle, subTitle } from "@/components/ui";

export type HowStep = { title: string; text: string };

// The frame for the form pages: what the page is for, how it works in three steps, then the form in a card with a column of
// things worth knowing beside it (under it below 1024px). Every form page says something before it asks something.
export function LeadPage({ title, intro, how, aside, children }: { title: string; intro: string; how?: HowStep[]; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-2 max-w-[65ch] text-body">{intro}</p>
      {how && (
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {how.map((s, i) => (
            <li key={s.title} className={`flex gap-4 ${card} p-4`}>
              <IconBadge size="sm">{i + 1}</IconBadge>
              <TitleText title={s.title} text={s.text} />
            </li>
          ))}
        </ol>
      )}
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div data-wells className={`w-full max-w-[640px] ${card} p-5 sm:p-6`}>
          {children}
        </div>
        {aside && <aside className="flex w-full max-w-[640px] flex-col gap-4 lg:w-96 lg:shrink-0">{aside}</aside>}
      </div>
    </main>
  );
}

// One card of tips beside the form.
export function Tips({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline p-5">
      <h2 className={subTitle}>{title}</h2>
      <ul className="flex flex-col gap-2 text-meta">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
