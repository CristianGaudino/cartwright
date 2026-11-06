import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/stock/*-provider", "**/lib/stock/demo-cars*"],
              message: "Import { stock } from '@/lib/stock' only (D-06).",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".open-next/**", ".wrangler/**", ".claude/**", ".agents/**", "playwright-report/**", "test-results/**", ".stock-cache/**"]),
]);
