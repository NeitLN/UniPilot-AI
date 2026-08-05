import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // `.agents/skills/**` and `.claude/skills/**` are standalone Node tooling
  // scripts run directly by the agent harness, not part of the Next.js app
  // or its TypeScript build. The TS-oriented rules here don't apply to them —
  // CommonJS `require` is exactly right for a plain `.js` script in a package
  // with no `"type": "module"`. Scoped to those folders so app code keeps
  // every rule.
  //
  // `.claude/**` holds the same skills as `.agents/**` and was missed when
  // this exemption was written. It only surfaced on CI: a bare `eslint` run
  // reaches those files on the Linux runner and not on the Windows machine
  // they were written on, so the repo linted clean locally and failed in CI
  // on a file nobody here authors.
  {
    files: [".agents/**/*.{js,mjs,cjs}", ".claude/**/*.{js,mjs,cjs}"],
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
