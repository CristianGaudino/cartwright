import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache yet: add the R2 override (as in vintage) when a page needs ISR/revalidation.
export default defineCloudflareConfig();
