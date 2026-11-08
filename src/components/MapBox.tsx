import { DirectionsButton } from "@/components/DirectionsButton";
import { card } from "@/components/ui";

// The map shows at once (the owner's choice). The box is sized from first paint, so nothing shifts when Google's frame arrives, and
// Get Directions sits beside it so a blocked frame or no scripts still leaves a way there.
export function MapBox({ embedUrl, directionsUrl, title }: { embedUrl: string; directionsUrl: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`aspect-[4/3] overflow-hidden ${card} contrast-more:border-text`}>
        <iframe src={embedUrl} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="size-full border-0" />
      </div>
      <DirectionsButton href={directionsUrl} />
    </div>
  );
}
