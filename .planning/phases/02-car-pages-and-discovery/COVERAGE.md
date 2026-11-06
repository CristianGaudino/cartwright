# API Coverage: Phase 2 (Car Pages and Discovery)

No external API integration: Phase 2 builds no runtime integration with any third-party service. Share uses the browser's own Web Share and Clipboard APIs and a plain `https://wa.me/?text=` link; nothing on the server calls WhatsApp, Facebook or Apple. Preview images are static files generated locally by a manual script (`scripts/stock/og.mjs`) from committed photos, never at request time. The car spec fields are parsed offline from the cache of the Phase 1 demo run, so no request goes to cartwright.ie. The only download is one font file from the official Inter release on GitHub (plan 02-08), done once by hand and committed.

Planned by gsd-planner on 2026-11-06. Revisit when a CarsIreland/Carsie or uploader.ie provider is built: that phase starts a full coverage matrix for the feed.
