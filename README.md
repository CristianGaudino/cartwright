# Cartwright

A modern rebuild of [cartwright.ie](https://www.cartwright.ie/), a used car dealer in Tralee, Co. Kerry.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · Neon Postgres + Drizzle (leads only) · Cloudflare Workers via OpenNext · GitHub Actions

## Status
Planning is done and the build has not started. Everything outstanding is in GitHub:

- [Issues](https://github.com/CristianGaudino/cartwright/issues) and the [project board](https://github.com/users/CristianGaudino/projects/6)
- v1 is issues #1-16. Start with #1 (foundation) and #2 (design direction).
- #17-25 are post-v1 (alerts, newsletters, social, admin and analytics) and sit in Backlog.

Project rules, decisions and the PR checklist are in [.claude/CLAUDE.md](.claude/CLAUDE.md). The reference for standards is the `vintage` repo.

## Demo data
The stock is the real cartwright.ie listings: 57 cars, fetched on 2026-11-05. Each has up to 6 photos, re-encoded to 900 x 675 WebP q72 (20.4 MB in total).

The owner authorised one call to the dealer site's own listing endpoint, with a generic user agent. That run also read the stock page, its main.js and each car's detail page, at least 1.5 seconds apart and never retried. In total: 61 requests to www.cartwright.ie and 343 photo requests to the Carsie CDN.

The photos and data belong to the dealer and CarsIreland. They are for the private pitch demo only. Before any public launch:
- replace them with the client's feed (see [docs/carsie-feed.md](docs/carsie-feed.md)) or supplied images
- delete `public/stock/`
- remove the noindex shortcuts: the `X-Robots-Tag` rule in `public/_headers` and the `robots` metadata on the /used-cars pages

To regenerate, run `npm run stock:fetch` then `npm run stock:build`. Never run them in CI or at build time.

## Design skills
Skills live in `.agents/skills` (pinned in `skills-lock.json`), primarily `apple-design`.
