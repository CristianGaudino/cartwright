import { useTransition } from "react";
import { accentButton, messagePage, pageTitle } from "@/components/ui";

// The page shown when something breaks: a title, one line and a button that tries again. Used by every error file.
export function ErrorScreen({ title = "Something Went Wrong", button = "Try Again", retry }: { title?: string; button?: string; retry: () => void }) {
  return (
    <main className={messagePage}>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">Check your connection and try again.</p>
      <RetryButton label={button} retry={retry} />
    </main>
  );
}

// retry() refetches inside a transition, so the button shows it is working until the page lands. StockError uses it too. Its class is
// stateButton's (StockError.tsx), written out to keep the two modules from importing each other.
export function RetryButton({ label, retry }: { label: string; retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => retry())} className={`mt-6 inline-flex items-center ${accentButton}`}>
      {pending ? "Trying Again" : label}
    </button>
  );
}
