import { groupHours } from "@/lib/dealer";
import { subTitle } from "@/components/ui";

// The opening hours as a list in a card. No "open now": the page is cached and that needs the visitor's clock.
export function OpeningHours() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={subTitle}>Opening Hours</h2>
      <dl className="flex flex-col divide-y divide-hairline rounded-card border border-hairline bg-card px-4">
        {groupHours().map((h) => (
          <div key={h.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt>{h.label}</dt>
            <dd className={`text-right tabular-nums ${h.hours === "Closed" ? "text-text-2" : "font-semibold"}`}>{h.hours}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
