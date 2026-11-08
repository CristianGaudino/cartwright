import { WhatsAppIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";
import { DEALER_WHATSAPP } from "@/lib/site";

// A labelled WhatsApp button (icon and the word), the pair of the Call button. Opens a chat in a new tab: on the dealer's number, or on
// `href` (the car page's, with the car's name already typed). `sizing` is the width and side padding.
export function WhatsAppButton({ href = DEALER_WHATSAPP, sizing = "w-full px-6 sm:w-auto sm:min-w-48" }: { href?: string; sizing?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`flex h-12 items-center justify-center gap-2 text-text ${sizing} ${secondaryButton}`}>
      <WhatsAppIcon className="size-5 text-whatsapp" />
      WhatsApp<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
