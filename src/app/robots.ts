import type { MetadataRoute } from "next";
import { SITE_URL, indexable } from "@/lib/site";

// Production is indexable (the 410 body lives at /gone). Anything else (demo, local) disallows every crawler
// except the share-preview agents, so link previews on WhatsApp, iMessage, Facebook and X still work.
export default function robots(): MetadataRoute.Robots {
  return indexable()
    ? { rules: { userAgent: "*", allow: "/", disallow: "/gone" }, sitemap: `${SITE_URL}/sitemap.xml` }
    : {
        rules: [
          { userAgent: ["facebookexternalhit", "Facebot", "Twitterbot"], allow: "/" },
          { userAgent: "*", disallow: "/" },
        ],
      };
}
