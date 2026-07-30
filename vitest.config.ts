import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// TD4-02 (docs/PRODUCT_REVIEW_4.md) — jsdom is the global environment now,
// not opt-in per file: both QA4-01 and QA4-02 slipped past 195 tests
// because unit tests never touched the DOM and E2E didn't assert hover
// state or badge text, so this is deliberately blanket rather than scoped
// to a "components" subfolder. It doesn't change how the existing
// lib/rules/*.test.ts pure-function tests run.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
