// Off-white pill, not accent: a sold car offers no action. Plain text, never an image. `hidden` hides it from screen readers where the word is read elsewhere.
export function SoldBadge({ className = "", hidden }: { className?: string; hidden?: boolean }) {
  return (
    <span aria-hidden={hidden || undefined} className={`inline-flex h-7 items-center rounded-full bg-text px-3 text-meta font-semibold text-ink ${className}`}>
      Sold
    </span>
  );
}
