import Link from "next/link";
import { ShareButton } from "@/components/car/ShareButton";
import { LeadActions } from "@/components/leads/LeadDialog";
import { SaveButton } from "@/components/saved/SaveButton";
import { DEALER_PHONE, SITE_URL } from "@/lib/site";
import { carName, carSummary, carTitle, formatPrice, keyFacts } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";
import { accentButton } from "@/components/ui";

const button = `flex w-full items-center justify-center gap-2 ${accentButton}`;

// Server component. A sold car shows no price and no Call now, and never its sale date (owner instruction, 2026-11-06).
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  return (
    <div data-testid="buy-box" className="flex flex-col gap-4 lg:rounded-card lg:border lg:border-hairline lg:bg-card lg:p-6">
      <div className="flex flex-col items-start gap-2">
        <h1 className="break-words text-heading font-semibold">{carTitle(car)}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-4">
        {!sold && <p className="text-display font-semibold tabular-nums">{formatPrice(car.priceEur)}</p>}
        <div className="flex items-center gap-2">
          <SaveButton id={car.id} label="Save this car" variant="page" />
          <ShareButton title={carName(car)} text={sold ? carName(car) : `${carName(car)}, ${formatPrice(car.priceEur)}`} url={`${SITE_URL}/used-cars/${car.slug}`} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        {keyFacts(car).map((f) => (
          <div key={f.label} className="min-w-0 rounded-card border border-hairline bg-card p-4 lg:border-0 lg:bg-surface">
            <dt className="text-meta text-text-2">{f.label}</dt>
            <dd className="break-words text-body font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
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
    </div>
  );
}
