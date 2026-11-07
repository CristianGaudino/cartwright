import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";

// The frame for the form pages (UI-SPEC Trade-in page): the form in a column of at most 640px, and the Prefer to talk card
// beside it from 1024px, under it below that.
export function LeadPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-display font-semibold">{title}</h1>
      <p className="mt-2 max-w-[65ch] text-body">{intro}</p>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="w-full max-w-[640px]">{children}</div>
        <aside className="flex max-w-[640px] flex-col gap-2 rounded-card bg-card p-6 lg:w-80 lg:shrink-0">
          <h2 className="text-heading font-semibold">Prefer to talk?</h2>
          <p className="text-body">
            Call us on{" "}
            {/* 44px tall to tap; the negative margin keeps the line where it was. */}
            <a href={`tel:${DEALER_TEL}`} className="-my-2.5 inline-flex min-h-11 items-center font-semibold underline">
              {DEALER_PHONE}
            </a>
          </p>
        </aside>
      </div>
    </main>
  );
}
