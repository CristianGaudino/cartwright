import { pageTitle } from "@/components/ui";

export type HowStep = { title: string; text: string };

// The frame for the form pages: what the page is for, how it works in three steps, then the form in a card with a column of
// things worth knowing beside it (under it below 1024px). Every form page says something before it asks something.
export function LeadPage({ title, intro, how, aside, children }: { title: string; intro: string; how?: HowStep[]; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-2 max-w-[65ch] text-body">{intro}</p>
      {how && (
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {how.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-card border border-hairline bg-card p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent ring-1 ring-accent/30">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="text-body font-semibold">{s.title}</span>
                <span className="text-meta text-text-2">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div data-wells className="w-full max-w-[640px] rounded-card border border-hairline bg-card p-5 sm:p-6">
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
      <h2 className="text-heading font-semibold">{title}</h2>
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
