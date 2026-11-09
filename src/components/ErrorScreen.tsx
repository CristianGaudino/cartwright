import { accentButton, messagePage, pageTitle } from "@/components/ui";

// The page shown when something breaks: a title, one line and a button that tries again. Used by every error file.
export function ErrorScreen({ title = "Something Went Wrong", button = "Try Again", retry }: { title?: string; button?: string; retry: () => void }) {
  return (
    <main className={messagePage}>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-4 max-w-[65ch] text-body text-text-2">Check your connection and try again.</p>
      <button type="button" onClick={retry} className={`mt-6 inline-flex items-center ${accentButton}`}>
        {button}
      </button>
    </main>
  );
}
