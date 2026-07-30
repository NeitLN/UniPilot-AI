import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Explicit rather than relying on Testing Library's auto-cleanup, which
// only self-registers when it detects a global `afterEach` — this project
// doesn't set `test.globals: true` (tests import describe/it/expect
// explicitly, matching every existing tests/rules/*.test.ts), so without
// this, DOM nodes from one test in a file leaked into the next.
afterEach(() => {
  cleanup();
});
