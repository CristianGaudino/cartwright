import { ChevronDownIcon } from "@/components/stock/icons";

// The one native select, with its chevron: phones get their own picker. `tone` is the fill, to read as a well on a card or on the page.
// Callers add the left padding and any extra classes; the right padding leaves room for the chevron.
export function SelectBox({ tone = "card", className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { tone?: "card" | "surface" }) {
  return (
    <span className="relative block min-w-0">
      <select {...props} className={`h-12 w-full min-w-0 appearance-none truncate rounded-control border border-control py-0 pr-10 text-body ${tone === "card" ? "bg-card" : "bg-surface"} ${className}`} />
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-3 h-6 w-6" />
    </span>
  );
}
