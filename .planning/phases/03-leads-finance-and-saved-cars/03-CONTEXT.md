# Phase 3: Leads, Finance and Saved Cars - Context

**Gathered:** 2026-11-06
**Amended:** 2026-11-06, after plan review (owner answers): D-05 Turnstile mode, D-18 heart layer, D-21 header count fade
**Status:** Ready for planning

<domain>
## Phase Boundary

A buyer can act on a car: save it, enquire, book a test drive, request a reservation, apply for finance, offer a trade-in, or ask the dealer to find a car. The dealer receives each as an email and a stored lead. Issues #11 (LED-01..03), #12 (LED-04..06), #9 (FIN-01..03), #10 (SAV-01, 02). Order: #11 first (database, email, shared form pattern); #10 is independent.

</domain>

<decisions>
## Implementation Decisions

The Phase 1 UI-SPEC tokens, type and motion still apply. Write the UI contract (e.g. `/gsd-ui-phase 3`) before building UI, per CLAUDE.md. Sold cars never show enquiry/test drive/reserve (Phase 2 D-05).

### Lead delivery and storage (LED-01, LED-02, LED-03)
- **D-01:** Email is sent with **Cloudflare Email Service** (owner's choice over Resend). The researcher must confirm it can send to an arbitrary external recipient from a Worker and what domain verification it needs; if it cannot, stop and ask the owner rather than switching silently. — **Reversibility:** reversible — one send function behind an interface.
- **D-02:** Demo leads go to the owner's inbox via a `LEAD_TO_EMAIL` secret. Subject is prefixed `[DEMO]` when `APP_ENV` is not production. Switching to the dealer is a config change.
- **D-03:** Neon Postgres + Drizzle is introduced here. Each lead is a **full row**: type, car id and slug snapshot, source page, contact details, message, consent timestamp and consent wording version, status. The email is a notification; the row is the record (future admin inbox, #20). — **Reversibility:** one-way — the schema is a migration target for the admin area and holds real personal data.
- **D-04:** Retention is a fixed period of **12 months**, a constant in code, stated in the privacy copy. The deletion job is deferred to the admin phase; flag the period for the dealer to confirm.

### Spam, consent, logging (LED-01, LED-03)
- **D-05:** Cloudflare **Turnstile**, **Managed widget with appearance `interaction-only`**: invisible for most visitors, a challenge shows only when Cloudflare needs one. Verified server-side, plus a hidden honeypot field. Per-IP rate limiting only if the researcher finds it cheap on Workers.
- **D-06:** A required, unticked consent checkbox with one plain line linking to the privacy page. Store timestamp and wording version.
- **D-07:** No marketing opt-in. Lead data is used only to answer the request (newsletter and alerts are Backlog).
- **D-08:** Never log payloads. Log only lead id, type and outcome. Errors are caught and rethrown without the body. A **test asserts it, and a lint rule forbids `console.*` in the lead code paths.** — **Reversibility:** reversible.

### Form UX and shared pattern (LED-01, LED-02, LED-06)
- **D-09:** Enquiry, test drive and reserve open from buttons in the Phase 2 reserved action area into a **native `<dialog>`** (sheet on phone, centred on desktop), reusing the lightbox and filter-sheet pattern. No layout shift.
- **D-10:** **One shared form** with a type picker. Common fields: name, phone, email, message. Test drive adds preferred day and time; reserve adds a short note. One component, one server action, validated server-side with clear field errors. Trade-in, sourcing and finance reuse the same shell (LED-06). — **Reversibility:** costly — every later form builds on this component and action.
- **D-11:** Reserve is a **request, not a hold**. Wording is "Request to reserve"; the dealer confirms by phone. No payment or deposit in v1.
- **D-12:** Name is required, plus **at least one of phone or email**.

### Trade-in and sourcing (LED-04, LED-05)
- **D-13:** Trade-in photos are optional, **up to 12 images** (owner raised it from 5: do not limit valuations), stored in **Cloudflare R2**, with a link kept in the lead. Validate type and size server-side, private bucket. The researcher sets per-file and total size caps and says how the dealer email links to them (signed URLs).
- **D-14:** Trade-in captures reg, mileage and optional make, model, year as plain fields. No paid reg-lookup API in v1.
- **D-15:** Own pages **/sell-your-car** and **/find-a-car**, linked from the header or footer and from Phase 2 empty landing pages (replacing the plain `/used-cars` link noted in 02-CONTEXT D-08).

### Finance (FIN-01, FIN-02, FIN-03)
- **D-16:** The calculator takes price, deposit, term and APR. Defaults live in one config file marked **PLACEHOLDER**, with a visible "representative only" note. The dealer's real terms and required wording replace it when supplied (client input still open, #9). Never invent APRs or terms.
- **D-17:** The finance application is saved as a lead and collects name, contact, deposit, term, employment status and consent. **No income, date of birth or bank details.**

### Saved cars (SAV-01, SAV-02)
- **D-18:** The heart sits in the top corner of the card photo at **`z-20`**, above the carousel's `z-10` and never under the card's stretched title link, and next to Share on the car page. 44px target, `aria-pressed`.
- **D-19:** **/saved** reuses the ListingCard grid, reads ids from localStorage and fetches those cars by id from the provider. Empty state links to `/used-cars`. Noindex. The header shows the count.
- **D-20:** A saved car that sells stays in the list with the Sold badge. A removed car drops out, its id is pruned from storage, and a short "No longer available" note shows once.
- **D-21:** Store **car ids only**, one key, synced across tabs via the `storage` event. No snapshot. The header count slot is reserved at a fixed width from the server render, and the number **fades in over 150 ms after hydration, with no layout shift**.

### Claude's Discretion
- Dialog internals, field order and microcopy, Turnstile integration details, Drizzle layout, R2 key naming and size caps, email template, heart icon, within the UI-SPEC tokens and the plain-text, no em dash rules.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and rules
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria.
- `.planning/REQUIREMENTS.md` — LED-01..06, FIN-01..03, SAV-01..02.
- `.claude/CLAUDE.md` — project rules (Next.js 16 docs first, consent and no-logging product rules, finance wording, no em dashes, PR rules).
- `.planning/phases/02-car-pages-and-discovery/02-CONTEXT.md` — D-05 sold rule, D-08 empty landing pages, D-13 reserved action area.
- `.planning/phases/01-design-and-stock-browsing/01-UI-SPEC.md` — tokens, card, motion, copy.
- `.agents/skills/apple-design/SKILL.md` — design skill.

### Code and framework
- `src/lib/stock/types.ts` — `Car`, `StockProvider` (fetch saved cars by id).
- `node_modules/next/dist/docs/` — server actions, route handlers, forms; OpenNext on Workers constraints.
- Reference repo `~/Developer/vintage` (`CristianGaudino/vintage`) — check for existing email, Neon/Drizzle and form patterns before inventing.
- GitHub issues #9, #10, #11, #12.

### External
- Cloudflare Email Service, Turnstile and R2 docs (researcher to confirm Workers support, limits and verification requirements).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/car/BuyBox.tsx`: holds the reserved action area for the form buttons.
- `src/components/car/PhotoLightbox.tsx`, `src/components/stock/FilterSheet.tsx`: native `<dialog>` patterns to reuse.
- `src/components/stock/ListingCard.tsx`, `PhotoCarousel.tsx`: heart placement and the saved grid.
- `src/components/car/ShareButton.tsx`: heart sits beside it.
- `src/components/SiteHeader.tsx`: saved count.
- `src/lib/stock/` provider (`getById`, `getBySlug`): saved page fetch.

### Established Patterns
- Tailwind v4 `@theme` tokens; co-located tests; `APP_ENV` gating (`robots.ts`); carousel is z-10 above the card's stretched title link.

### Integration Points
- New: database layer (Neon + Drizzle), server action for leads, Turnstile verify, email sender, R2 upload, `/sell-your-car`, `/find-a-car`, `/saved`, finance calculator and config. No form, database or email dependencies exist in `package.json` yet.

</code_context>

<specifics>
## Specific Ideas

- Trade-in must not feel limited: up to 12 photos.
- Placeholder finance figures must be obviously placeholders until the client's terms arrive.

</specifics>

<deferred>
## Deferred Ideas

- **Dealer WhatsApp trade-in flow (owner, future development):** when a trade-in enquiry comes in, send it to a set dealer WhatsApp number with the photos and text. The dealer replies to the notification with just a price, and the system sends that on to the buyer with the standard added wording. Needs the WhatsApp Business Platform (Cloud API) with approved message templates and a reply-to-lead mapping. Phase 3 stores trade-in leads with photo links so this can build on them.
- Lead deletion job after the retention period: admin phase (#20).
- Marketing opt-in, alerts, newsletter: Backlog (#17, #19).
- Online deposit or payment for reservations: not in v1.
- Reg lookup API for trade-ins: not in v1.

</deferred>

---

*Phase: 3-Leads, Finance and Saved Cars*
*Context gathered: 2026-11-06*
