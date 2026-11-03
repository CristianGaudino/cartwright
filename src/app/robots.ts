import type { MetadataRoute } from "next";

// Only production lets search engines in. Set APP_ENV=production at build time.
export default function robots(): MetadataRoute.Robots {
  return process.env.APP_ENV === "production"
    ? { rules: { userAgent: "*", allow: "/" } }
    : { rules: { userAgent: "*", disallow: "/" } };
}
