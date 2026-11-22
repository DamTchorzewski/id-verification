import { defineConfig } from "vitest/config";

// Unit tests for the logic that needs no browser (the MRZ parser, the country match, the report).
// The Angular components are covered by the end-to-end tests in tests/e2e.
export default defineConfig({
  test: {
    environment: "node",
    include: ["web/src/**/*.test.ts"],
  },
});
