// What the lead forms and the server share. No zod here: client components import this file, and pulling in
// schema.ts would ship zod to every car page.

// Change the version whenever the text changes: every lead stores the version it was sent under (D-06).
export const CONSENT = { version: "2026-11-06", text: "I agree to Carright using these details to reply to my request." } as const;
// D-04: leads are kept this long, then deleted (by hand per docs/lead-retention.md until #20). The dealer must confirm
// the period; /privacy and docs/lead-retention.md state it, so change all three together.
export const LEAD_RETENTION_MONTHS = 12;
export const LIMITS = { name: 100, phone: 30, email: 200, message: 1000 } as const;
// D-12: shown once, under Email; ContactFields marks both fields when it is set.
export const CONTACT_ERROR = "Add a phone number or an email.";

// YYYY-MM-DD for tomorrow in Ireland, where the dealer is, so the form's min and the server agree.
export const tomorrow = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(now.getTime() + 86_400_000);
export const TIMES = { any: "Any time", morning: "Morning", afternoon: "Afternoon" } as const;
