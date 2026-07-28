import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore is our marker for "required by the signature,
      // deliberately unused" (e.g. the storage adapters' `put` contract).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare build output. `.open-next` alone is ~50 MB of bundled JS —
    // linting it exhausts the Node heap before it reaches any of our source.
    ".open-next/**",
    ".wrangler/**",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
