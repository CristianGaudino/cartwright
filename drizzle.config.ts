import { defineConfig } from "drizzle-kit";

// Only generates SQL from the schema. wrangler applies it (npm run db:migrate), so no credentials live here.
export default defineConfig({
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
});
