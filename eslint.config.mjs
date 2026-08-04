import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // `.agents/skills/**` are standalone Node tooling scripts run directly by
  // the agent harness, not part of the Next.js app or its TypeScript build.
  // The TS-oriented rules here don't apply to them — CommonJS `require` is
  // exactly right for a plain `.js` script in a package with no
  // `"type": "module"`. Scoped to that folder so app code keeps every rule.
  {
    files: [".agents/**/*.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
