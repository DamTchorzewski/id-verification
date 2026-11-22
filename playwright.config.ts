import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the production build, served locally (reops/standards/testing.md).
// The app makes no external request, so there is nothing to intercept: OpenCV, Tesseract and MediaPipe
// run for real on the specimen card.
// an uncommon port: a server of another project on 4173 would be reused silently
const PORT = 4193;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}/id-verification/`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT}`,
    env: { SITE_URL: "" },
    url: `http://localhost:${PORT}/id-verification/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
