import { defineConfig } from "drizzle-kit";

// Local: .env.local (a Neon dev branch). In the deploy workflow the env is already set.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  // drizzle-kit itself reports a clear error if this is missing
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
});
