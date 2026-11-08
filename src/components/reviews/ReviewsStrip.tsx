import { AutoCarousel } from "@/components/AutoCarousel";
import { StarIcon } from "@/components/stock/icons";
import type { Review, Reviews } from "@/lib/reviews";
import { card, sectionTitle, textLink } from "@/components/ui";

const POLICY_URI = "https://support.google.com/contributionpolicy/answer/7422880";
const NEW_TAB = { target: "_blank", rel: "noopener noreferrer" } as const;
const NewTab = ({ label = "" }: { label?: string }) => <span className="sr-only">{label} (opens in a new tab)</span>;

// Google's Places policy: when no Google map is shown, the attribution is the text "Google Maps" in white, black or
// #5E5E5E, Roboto first. No web font is loaded, so Roboto is used where the device has it. The one place this lives.
function GoogleAttribution() {
  return (
    <span className="text-meta font-normal text-white" style={{ fontFamily: "Roboto, var(--font-sans)" }}>
      Google Maps
    </span>
  );
}

// A filled row clipped to the exact average over an outline row: pure CSS, no half stars. Never red or yellow.
function StarRating({ value, size }: { value: number; size: 16 | 20 }) {
  const star = size === 16 ? "size-4 shrink-0" : "size-5 shrink-0";
  const row = (filled: boolean) => [0, 1, 2, 3, 4].map((i) => <StarIcon key={i} filled={filled} className={star} />);
  return (
    <span aria-hidden="true" className="relative inline-flex text-text-2">
      {row(false)}
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-text" style={{ width: `${Math.round(value * 200) / 10}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className={`flex h-full flex-col gap-3 ${card} p-4 contrast-more:border-text`}>
      <div>
        <StarRating value={review.rating} size={16} />
        <span className="sr-only">Rated {review.rating} out of 5</span>
      </div>
      {/* Never altered: the clamp is visual only, the DOM keeps the full text. */}
      {review.text && (
        <p lang={review.languageCode} className="line-clamp-8 text-body">
          {review.text}
        </p>
      )}
      <div className="mt-auto flex items-start gap-3">
        {review.photoUri && (
          // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar; images are unoptimized on this Worker
          <img src={review.photoUri} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-photo-bg" />
        )}
        <div className="min-w-0">
          <p className="break-words text-body font-semibold">
            {review.authorUri ? (
              <a href={review.authorUri} {...NEW_TAB} className="underline">
                {review.author}
                <NewTab />
              </a>
            ) : (
              review.author
            )}
          </p>
          <p className="flex flex-wrap items-center text-meta text-text-2">
            <a href={review.reviewUri} {...NEW_TAB} className={textLink}>
              {review.relativeTime}
              <NewTab label=" on Google Maps" />
            </a>
            <span aria-hidden="true" className="mx-2">
              ·
            </span>
            <GoogleAttribution />
          </p>
        </div>
      </div>
    </article>
  );
}

// Server component. Nothing renders without reviews: no heading, no gap, no error text (UI-SPEC failure behaviour).
export function ReviewsStrip({ data }: { data: Reviews | null }) {
  if (!data?.reviews.length) return null;
  const { rating, count } = data;
  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="reviews-heading" className={sectionTitle}>
          What Customers Say
        </h2>
        <p className="text-meta text-text-2">Showing the most relevant reviews from Google Maps.</p>
      </div>
      {rating !== undefined && count !== undefined && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="sr-only">
            Rated {rating.toFixed(1)} out of 5 from {count} Google reviews
          </p>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-display font-semibold tabular-nums">
              {rating.toFixed(1)}
            </span>
            <StarRating value={rating} size={20} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4">
            <p className="text-meta text-text-2">Based on {count} Google reviews</p>
            <a href={data.placeUri} {...NEW_TAB} className={`${textLink} text-meta`}>
              See All on Google Maps
              <NewTab />
            </a>
          </div>
        </div>
      )}
      {/* Moves along by itself and stops under the pointer: one card on a phone, two, then four across (more than three shows). */}
      <AutoCarousel label="Google reviews" noun="reviews">
        {data.reviews.map((r) => (
          <li key={r.id} className="w-[85%] shrink-0 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]">
            <ReviewCard review={r} />
          </li>
        ))}
      </AutoCarousel>
      {/* Google requires its review policy to be linked wherever its reviews show. */}
      <a href={POLICY_URI} {...NEW_TAB} className={`${textLink} self-start text-meta`}>
        Google&apos;s review policy
        <NewTab />
      </a>
    </section>
  );
}
