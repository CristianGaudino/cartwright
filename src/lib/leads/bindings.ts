import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AnyD1Database } from "drizzle-orm/d1";

// Hand-written subsets of the Cloudflare binding types (RESEARCH Pattern 5): @cloudflare/workers-types clashes with the DOM lib.
// Message shape: developers.cloudflare.com/email-service/api/send-emails/workers-api/
export interface SendEmail {
  send(msg: { to: string; from: string; subject: string; text: string; replyTo?: string }): Promise<{ messageId: string }>;
}

export interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface PhotoBucket {
  put(key: string, value: Blob | ArrayBuffer | ReadableStream, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(keys: string | string[]): Promise<void>;
}

type LeadBindings = { EMAIL?: SendEmail; LEAD_LIMITER?: RateLimit; LEAD_PHOTOS?: PhotoBucket; DB?: AnyD1Database };

// The one place that reads Cloudflare bindings. Outside the Worker (next start, tests) there is no context, so this returns {}.
export function getBindings(): LeadBindings {
  try {
    return getCloudflareContext().env as LeadBindings;
  } catch {
    return {};
  }
}
