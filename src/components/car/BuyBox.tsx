import Link from "next/link";
import { ShareButton } from "@/components/car/ShareButton";
import { CompareButton } from "@/components/compare/CompareButton";
import { LeadActions } from "@/components/leads/LeadDialog";
import { PlaceholderPill } from "@/components/PlaceholderPill";
import { SaveButton } from "@/components/saved/SaveButton";
import { CalendarIcon, CarIcon, FuelIcon, GaugeIcon, GearIcon, ShieldCheckIcon } from "@/components/stock/icons";
import { DEALER_FACTS_CONFIRMED, DEALER_PHONE, SITE_URL, WARRANTY } from "@/lib/site";
import { carMeta, carName, carSummary, carTitle, formatPrice, keyFacts } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { accentButton } from "@/components/ui";

const button = `flex w-full items-center justify-center gap-2 ${accentButton}`;
const FACT_ICONS: Record<string, typeof CarIcon> = { Year: CalendarIcon, Mileage: GaugeIcon, Fuel: FuelIcon, Transmission: GearIcon };

// Server component. A sold car shows no price and no Call now, and never its sale date (owner instruction, 2026-11-06).
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  return (
    <div data-testid="buy-box" className="flex flex-col gap-4 lg:rounded-card lg:border lg:border-hairline lg:bg-card lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 break-words text-display font-semibold">{carTitle(car)}</h1>
        <div className="shrink-0">
          <SaveButton id={car.id} label="Save this car" variant="page" />
        </div>
      </div>
      <p className="-mt-2 text-meta text-text-2">{carMeta(car)}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-4">
        {!sold && <p className="text-display font-semibold tabular-nums">{formatPrice(car.priceEur)}</p>}
        <div className="flex items-center gap-2">
          {!sold && <CompareButton id={car.id} label={`Compare ${carName(car)}`} variant="page" />}
          <ShareButton title={carName(car)} text={sold ? carName(car) : `${carName(car)}, ${formatPrice(car.priceEur)}`} url={`${SITE_URL}/used-cars/${car.slug}`} />
        </div>
      </div>
      {/* Reserved in Phase 2 for the lead buttons: 104px on phones, so adding rows moves nothing below. */}
      <div data-testid="action-area" className="min-h-[104px] lg:min-h-0">
        {sold ? (
          <div className="flex flex-col gap-2 rounded-card border border-hairline bg-card p-4 lg:bg-surface">
            <p className="text-heading font-semibold">Sold</p>
            <p className="text-meta text-text-2">This car is no longer for sale.</p>
            <Link href={`/used-cars/${car.makeSlug}`} className={button}>
              See more {car.make}
            </Link>
          </div>
        ) : (
          <>
            <LeadActions car={carSummary(car)} />
            <p className="mt-2 hidden text-meta text-text-2 lg:block">{DEALER_PHONE}</p>
          </>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hairline bg-hairline">
        {keyFacts(car).map((f) => {
          const Icon = FACT_ICONS[f.label] ?? CarIcon;
          return (
            <div key={f.label} className="flex min-w-0 flex-col items-center gap-1 bg-card p-4 text-center lg:bg-surface">
              <Icon className="size-6" />
              {/* Label first in the source, as a list needs; the value shows above it. */}
              <dt className="order-3 text-meta text-text-2">{f.label}</dt>
              <dd className="order-2 break-words text-meta font-semibold">{f.value}</dd>
            </div>
          );
        })}
      </dl>
      {!sold && (
        <div className="flex items-start gap-3 rounded-card border border-hairline bg-card p-4 lg:bg-surface">
          <ShieldCheckIcon className="mt-0.5 size-8 shrink-0 text-accent" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body font-semibold">{WARRANTY.title} included</p>
            <p className="text-meta text-text-2">{WARRANTY.text}</p>
            {!DEALER_FACTS_CONFIRMED && <PlaceholderPill>Placeholder details</PlaceholderPill>}
          </div>
        </div>
      )}
    </div>
  );
}
