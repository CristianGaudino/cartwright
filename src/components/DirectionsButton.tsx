import { PinIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";

// Opens the route to the dealer in Google Maps, in a new tab. A map pin, then the words.
export function DirectionsButton({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex h-12 items-center justify-center gap-2 self-start px-6 ${secondaryButton}`}>
      <PinIcon className="size-5 text-accent" />
      Get Directions<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
