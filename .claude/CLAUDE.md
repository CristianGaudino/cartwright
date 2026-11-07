# Carright project rules

Read automatically by Claude Code at the start of a session. Edit it like any other file, in a PR.

## What this is
A rebuild of https://www.cartwright.ie/ (used car dealer, Tralee, Co. Kerry) as a speculative pitch and first sale for the owner's web business. Public pages only, no private pages for customers. Work is tracked in GitHub issues and the [Carright project](https://github.com/users/CristianGaudino/projects/6). Read the issues before planning anything.

## Decisions already made
- Stack: Next.js 16 (App Router; Cache Components are off until OpenNext on Workers supports them, opennextjs-cloudflare#1450), Tailwind CSS v4, Cloudflare Workers via OpenNext (same as the vintage repo), GitHub Actions.
- Stock is not stored in a database. It sits behind a `StockProvider` interface: a generated file-backed provider for the demo, a CarsIreland/Carsie provider once the client has API access (#16). Reviews work the same way (`ReviewsProvider`, #13).
- Neon Postgres + Drizzle only for leads and later alert/newsletter subscriptions. Clerk only for the future admin area (#20). The public site has no auth.
- Saved cars live in localStorage.
- Design: modernised, not a copy of the current site. The logo is the only locked asset. Design with the skills in `.agents/skills`, primarily `apple-design`, and write the contract before building UI.
- Scope: v1 is issues #1-16 (Todo). Alerts, newsletters, social embeds and the admin/analytics work (#17-25) are Backlog and not part of v1.
- Planning lives in GitHub issues.

## Standards
The `vintage` repo (`~/Developer/vintage`, GitHub `CristianGaudino/vintage`) is the reference for code, design and process. When unsure of a standard, follow it. If still unsure, ask the owner and ask for context rather than guessing.

## Working in git
- Never commit on `main`. Branch first (`git switch -c <type>/<name>`), including for planning docs. The only exception was the initial repo setup push.
- Open every PR against `main`, never against another feature branch (GitHub closes a PR whose base branch is merged and deleted).
- Open PRs ready for review, not as drafts, so CI runs on them. Never merge a PR yourself: open it and stop.
- Link the issue in the PR (`Closes #n`) and move it on the project board.
- Stage named files, not `git add -A`. Never push `.env*`, `test-results/` or `playwright-report/`.
- GitHub Actions minutes are limited and shared. Push fewer, finished commits.

## Before opening a PR
1. Run the ponytail audit (`/ponytail:ponytail-audit`) on what the branch changed: the changed files plus their callers and tests.
2. Fix what it raises on the same branch. A real trade-off goes in the PR description for the owner to decide.
3. Run lint, typecheck, unit tests and the E2E spec against a production build. Open the PR only if they pass. Say what the audit found and the E2E result in the PR.
4. Skip steps 1 and 3 for docs-only, workflow-only or copy-only changes, and say so in the PR.

Check by exit code, not by reading output for "error": `npm run lint; echo $?`, `npm test`, `npm run build`. Typecheck with `npx tsc --noEmit`.

## Next.js 16
This is not the Next.js in your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices. `next dev` writes an `AGENTS.md` block about this; commit it.

## Releases
Every merge to `main` deploys to production (deploy.yml). For now there are no release-tag deploys; the Release workflow only tags and publishes notes. Roll back by running Deploy from the Actions tab with an older tag or commit. Move to release-tag deploys, as in vintage, once there is a live client site.

## Product rules
- On-screen text is plain, short and human. No em dashes anywhere on the site. If a label already says it, drop the helper text.
- Finance figures are representative only and carry the dealer's required wording. Never invent APRs or terms: use the client's, or label them as placeholders.
- Real customer data (leads, subscribers) is personal data: collect with consent, keep it minimal, and never log it.
- Mobile first. Fast on a mid-range phone is a feature, not a polish step.
