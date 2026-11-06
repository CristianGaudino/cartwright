export const SITE_URL = "https://carright.cgaudino.com"; // demo domain (wrangler.jsonc routes); swap for the client's domain at handover
export const SITE_NAME = "Carright";
export const DEALER_PHONE = "083 133 3154"; // as published on cartwright.ie (083-1333154); confirm with the dealer
export const DEALER_TEL = "+353831333154";
// Placeholder until 03-02 onboards the sending domain and records the address; must be on that domain. Swap at handover.
export const LEAD_FROM_EMAIL = "leads@cgaudino.com";
// The only reader of APP_ENV. A function so tests can stub the env.
export const isProduction = () => process.env.APP_ENV === "production";
export const indexable = () => isProduction();
