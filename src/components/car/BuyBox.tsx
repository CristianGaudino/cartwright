import Link from "next/link";
import { PhoneIcon } from "@/components/stock/icons";
import { SoldBadge } from "@/components/stock/SoldBadge";
import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";
import { carTitle, formatPrice, keyFacts } from "@/lib/stock/format";
import { isSold } from "@/lib/stock/types";
import type { Car } from "@/lib/stock/types";

const button = "flex h-12 w-full items-center justify-center gap-2 rounded-control bg-accent font-semibold text-white active:scale-[0.97] motion-reduce:active:scale-100";

// Server component. A sold car shows no price and no Call now, and never its sale date (owner instruction, 2026-11-06).
export function BuyBox({ car }: { car: Car }) {
  const sold = isSold(car);
  return (
    <div data-testid="buy-box" className="flex flex-col gap-4 lg:rounded-card lg:border lg:border-hairline lg:bg-card lg:p-6">
      <div className="flex flex-col items-start gap-2">
        {sold && <SoldBadge />}
        <h1 className="break-words text-heading font-semibold">{carTitle(car)}</h1>
      </div>
      {!sold && <p className="text-display font-semibold tabular-nums">{formatPrice(car.priceEur)}</p>}
      <dl className="grid grid-cols-2 gap-4">
        {keyFacts(car).map((f) => (
          <div key={f.label} className="min-w-0 rounded-card border border-hairline bg-card p-4 lg:border-0 lg:bg-surface">
            <dt className="text-meta text-text-2">{f.label}</dt>
            <dd className="break-words text-body font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
      {/* Reserved for Phase 3's Enquire, Test drive and Reserve buttons: 104px on phones so adding them moves nothing below. */}
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
            <a href={`tel:${DEALER_TEL}`} className={button}>
              <PhoneIcon />
              Call now
            </a>
            <p className="mt-2 hidden text-meta text-text-2 lg:block">{DEALER_PHONE}</p>
          </>
        )}
      </div>
    </div>
  );
}
