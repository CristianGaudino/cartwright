import { PhoneIcon } from "@/components/stock/icons";
import { DEALER_TEL } from "@/lib/site";
import { accentButton, pageTitle } from "@/components/ui";

// Shared text-page frame (service, about, terms, privacy, warranty).
export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <h1 className={pageTitle}>{title}</h1>
      {intro && <p className="mt-2 max-w-[65ch] text-body">{intro}</p>}
      <div className="mt-6 flex max-w-[65ch] flex-col gap-8 text-body">{children}</div>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-heading font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// The page's one accent button: dial the dealer. Full width on phones, at least 240px from 640px.
export function CallButton({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={`tel:${DEALER_TEL}`}
      className={`flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-60 sm:self-start ${accentButton}`}
    >
      <PhoneIcon className="size-5" />
      {children}
    </a>
  );
}
