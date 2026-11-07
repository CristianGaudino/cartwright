export const SITE_URL = "https://carright.cgaudino.com"; // demo domain (wrangler.jsonc routes); swap for the client's domain at handover
export const SITE_NAME = "Carright";
export const DEALER_PHONE = "083 133 3154"; // as published on cartwright.ie (083-1333154); confirm with the dealer
// PLACEHOLDER until carright.ie forwards to the dealer (issue #54).
export const DEALER_EMAIL = "hello@carright.ie";
export const DEALER_TEL = "+353831333154";
// The same number is the dealer's WhatsApp: the old cartwright.ie footer links it. Confirm with the dealer.
export const DEALER_WHATSAPP = `https://wa.me/${DEALER_TEL.slice(1)}`;
// Placeholder until 03-02 onboards the sending domain and records the address; must be on that domain. Swap at handover.
export const LEAD_FROM_EMAIL = "leads@cgaudino.com";
// The only reader of APP_ENV. A function so tests can stub the env.
export const isProduction = () => process.env.APP_ENV === "production";
export const indexable = () => isProduction();

// PLACEHOLDER: stays false until the dealer confirms the services, About story and terms (address and hours are confirmed). While
// false, pages show the Placeholder details pill and JSON-LD leaves out the street, postcode and hours. site.test.ts
// fails a production deploy while it is false; dealer.test.ts fails if it is set while a bracketed value remains.
export const DEALER_FACTS_CONFIRMED = false;
// PLACEHOLDER: the dealer confirms the list.
export const SERVICES = ["Servicing", "Repairs", "Tyres"] as const;
// Confirmed by the dealer, 2026-11-07.
export const DEALER_ADDRESS = { street: "Ballymac, Maglass", town: "Tralee", county: "Co. Kerry", eircode: "V92 NT93" };
// PLACEHOLDER until the dealer confirms the warranty (owner decision, 2026-11-07): shown on the home page and every car for sale.
export const WARRANTY = { title: "3 month warranty", text: "Engine and gearbox cover on all cars." };
export const DEALER_ADDRESS_LINES = [DEALER_ADDRESS.street, DEALER_ADDRESS.town, DEALER_ADDRESS.county, DEALER_ADDRESS.eircode];
// Confirmed by the dealer, 2026-11-07. 24 hour HH:MM; no opens means closed.
export const OPENING_HOURS: { day: string; opens?: string; closes?: string }[] = [
  { day: "Monday", opens: "09:30", closes: "18:00" },
  { day: "Tuesday", opens: "09:30", closes: "18:00" },
  { day: "Wednesday", opens: "09:30", closes: "18:00" },
  { day: "Thursday", opens: "09:30", closes: "18:00" },
  { day: "Friday", opens: "09:30", closes: "18:00" },
  { day: "Saturday", opens: "10:00", closes: "16:00" },
  { day: "Sunday" },
];
