import { WhatsAppIcon } from "@/components/stock/icons";
import { secondaryButton } from "@/components/ui";
import { DEALER_WHATSAPP } from "@/lib/site";

// A labelled WhatsApp button (icon and the word), the pair of the Call button. Opens a chat on the dealer's number in a new tab.
export function WhatsAppButton() {
  return (
    <a href={DEALER_WHATSAPP} target="_blank" rel="noopener noreferrer" className={`flex h-12 w-full items-center justify-center gap-2 px-6 text-text sm:w-auto sm:min-w-48 ${secondaryButton}`}>
      <WhatsAppIcon className="size-5" />
      WhatsApp<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
