# API Coverage: Phase 1 (Design and Stock Browsing)

No external API integration: Phase 1 builds no runtime integration with any third-party service. The CarsIreland/Carsie feed is only investigated and written up in docs/carsie-feed.md because the client has no access yet (D-09, issue 16), and no Carsie provider is built. The only outbound calls are a local, manual, one-run demo-data script (one listing call to the dealer's own site plus its public pages and CDN photos, D-04 and D-10) that never runs in CI, at build time or at runtime; the deployed site serves the committed demo file and local photos only.

Planned by gsd-planner on 2026-11-03. Revisit when a Carsie/CarsIreland provider is built: that phase starts a full coverage matrix for the feed.
