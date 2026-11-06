import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No cacheComponents: OpenNext on Cloudflare Workers can't run it yet (opennextjs-cloudflare#1450).
  // Revisit when that is fixed, and update .claude/CLAUDE.md.
  poweredByHeader: false,
  // Images are pre-sized static files and this Worker has no Images binding (RESEARCH Pitfall 1).
  images: { unoptimized: true },
  // The Worker gets no runtime APP_ENV, so inline it at build time for request-time pages (RESEARCH Pitfall 1). Never put a secret here.
  env: { APP_ENV: process.env.APP_ENV ?? "" },
};

export default nextConfig;
