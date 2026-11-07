# Phase 3: Leads, Finance and Saved Cars - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-06
**Phase:** 3-Leads, Finance and Saved Cars
**Areas discussed:** Lead delivery/spam/consent, Form UX and shared pattern, Trade-in/sourcing/finance, Saved cars UX

---

## Lead delivery, spam, consent

| Question | Options | Chosen |
|----------|---------|--------|
| Email | Resend (recommended); Cloudflare Email Service; You decide | Cloudflare Email Service |
| Demo inbox | Owner's inbox via env (recommended); Store only | Owner's inbox via env |
| Storage | Full lead row (recommended); Minimal metadata | Full lead row |
| Retention | Fixed 12 months (recommended); Until deleted; You decide | Fixed 12 months |
| Spam | Turnstile + honeypot (recommended); Honeypot + rate limit; You decide | Turnstile + honeypot |
| Consent | Required unticked checkbox (recommended); Notice only | Required checkbox |
| Marketing opt-in | No (recommended); Separate tick | No |
| No logging | Id/type/outcome only; plus lint/test guard | Both (lint/test guard added) |

## Form UX and shared pattern

| Question | Options | Chosen |
|----------|---------|--------|
| Placement | Native dialog from action area (recommended); Inline; Separate route | Native dialog |
| Form shape | One shared form (recommended); Three forms | One shared form |
| Reserve | Request, dealer confirms (recommended); Online deposit | Request |
| Contact | Name + phone or email (recommended); All required | Name + phone or email |

## Trade-in, sourcing, finance

| Question | Options | Chosen |
|----------|---------|--------|
| Photos | R2 + link (recommended, 5 images); Email attachments; Skip | R2 + link, **up to 12 images** |
| Reg capture | Plain fields (recommended); Reg lookup API | Plain fields |
| Where | Own pages (recommended); Dialogs only | /sell-your-car, /find-a-car |
| Finance | Placeholder terms (recommended); Calculator only | Placeholder terms + application |

## Saved cars UX

| Question | Options | Chosen |
|----------|---------|--------|
| Heart | Photo corner + beside Share (recommended); Under card | Photo corner + beside Share |
| Saved page | /saved grid (recommended); Header drawer | /saved grid |
| Gone cars | Sold stays, removed drops with note (recommended); Drop both | Sold stays, removed drops |
| Storage | Ids only (recommended); Id + snapshot | Ids only |

## Claude's Discretion

Dialog internals, field order, microcopy, Turnstile details, Drizzle layout, R2 key naming and size caps, email template, heart icon.

## Deferred Ideas

- Dealer WhatsApp trade-in flow (owner, mid-discussion): trade-in goes to a set dealer number with photos and text; dealer replies with a price; system relays it to the buyer with standard wording.
- Lead deletion job, marketing opt-in, online deposit, reg lookup API.
