import Link from "next/link";
import { ShareButton } from "@/components/car/ShareButton";
import { CompareButton } from "@/components/compare/CompareButton";
import { LeadActions } from "@/components/leads/LeadDialog";
import { SaveButton } from "@/components/saved/SaveButton";
import { CalendarIcon, CarIcon, FuelIcon, GaugeIcon, GearIcon, ShieldCheckIcon } from "@/components/stock/icons";
import { DEALER_WHATSAPP, SITE_URL, WARRANTY } from "@/lib/site";
import { carMeta, carName, carSummary, formatPrice, keyFacts } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { accentButton, card } from "@/components/ui";

const button = `flex w-full items-center justify-center gap-2 ${accentButton}`;
const FACT_ICONS: Record<string, typeof CarIcon> = { Year: CalendarIcon, Mileage: GaugeIcon, Fuel: FuelIcon, Transmission: GearIcon };

// Server component. A sold car shows no price and no Call Us, and never its sale date (owner instruction, 2026-11-06).
// Laid out as the mockup's car page: the title and a heart, the details line, the price, the buttons, four facts, the warranty.
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  const url = `${SITE_URL}/used-cars/${car.slug}`;
  const whatsapp = `${DEALER_WHATSAPP}?text=${encodeURIComponent(`Hi, I'm interested in the ${carName(car)}: ${url}`)}`;
  return (
    <div data-testid="buy-box" className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        {/* Make and model large, the variant under it: a 60 character variant would otherwise fill a phone screen. The text reads as carTitle. */}
        <h1 className="min-w-0 break-words text-display font-bold">
          {car.make} {car.model}
          {car.variant && (
            <>
              {" "}
              <span className="mt-1 block text-heading font-semibold text-text-2">{car.variant}</span>
            </>
          )}
        </h1>
        {/* Share beside the heart, where a buyer looks for them. */}
        <div className="flex shrink-0 items-center">
          <ShareButton iconOnly title={carName(car)} text={sold ? carName(car) : `${carName(car)}, ${formatPrice(car.priceEur)}`} url={url} />
          <SaveButton id={car.id} label="Save This Car" variant="page" />
        </div>
      </div>
      <p className="-mt-3 text-body text-text-2">{carMeta(car)}</p>
      {!sold && <p className="text-hero font-bold tabular-nums">{formatPrice(car.priceEur)}</p>}
      {/* Reserved in Phase 2 for the lead buttons: so adding rows moves nothing below. */}
      <div data-testid="action-area" className="flex flex-col gap-3">
        {sold ? (
          <div className={`flex flex-col gap-2 ${card} p-4`}>
            <p className="text-heading font-semibold">Sold</p>
            <p className="text-meta text-text-2">This car is no longer for sale.</p>
            <Link href={`/used-cars/${car.makeSlug}`} className={button}>
              See More {car.make}
            </Link>
          </div>
        ) : (
          <LeadActions car={carSummary(car)} whatsapp={whatsapp} />
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hairline bg-hairline lg:grid-cols-4">
        {keyFacts(car).map((f) => {
          const Icon = FACT_ICONS[f.label] ?? CarIcon;
          return (
            <div key={f.label} className="flex min-w-0 flex-col items-center gap-1 bg-surface p-4 text-center">
              <Icon className="size-6" />
              {/* Label first in the source, as a list needs; the value shows above it. */}
              <dt className="order-3 text-meta text-text-2">{f.label}</dt>
              <dd className="order-2 break-words text-meta font-semibold">{f.value}</dd>
            </div>
          );
        })}
      </dl>
      {/* Under the facts, full width, so the buttons and facts stay in view on a phone. */}
      {!sold && <CompareButton id={car.id} label={`Compare ${carName(car)}`} sizing="flex h-12 w-full px-4" />}
      {!sold && (
        <div className={`flex items-start gap-3 ${card} p-4`}>
          <ShieldCheckIcon className="mt-0.5 size-8 shrink-0 text-accent" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body font-semibold">3 Month Warranty Included</p>
            <p className="text-meta text-text-2">{WARRANTY.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
