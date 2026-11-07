import { DEALER_PHONE, DEALER_TEL } from "@/lib/site";

// The dealer's number as a tap-to-call link. Shows the number unless given other children.
export function PhoneLink({ className = "font-semibold underline", children = DEALER_PHONE }: { className?: string; children?: React.ReactNode }) {
  return (
    <a href={`tel:${DEALER_TEL}`} className={className}>
      {children}
    </a>
  );
}
