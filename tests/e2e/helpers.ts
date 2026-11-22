import { expect, type Page } from "@playwright/test";

// Every page template, shared by the smoke and the accessibility tests. The app has one page;
// an unknown path is served by 404.html, which is the same app.
export const ROUTES = ["./", "no-such-page/"] as const;

// MediaPipe and Tesseract print their own diagnostics through console.error; they are not errors.
const BENIGN = [
  /^INFO: Created TensorFlow Lite XNNPACK delegate/,
  /^Estimating resolution as \d+/,
  /^Detected \d+ diacritics/,
];

// Any console error (a CSP violation included) or page error fails the test.
export function trackErrors(page: Page, allow: RegExp[] = []) {
  const errors: string[] = [];
  page.on("console", (message) => {
    const benign = [...BENIGN, ...allow].some((pattern) => pattern.test(message.text()));
    if (message.type() === "error" && !benign) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    expectNone: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export async function setTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("idv.theme", value);
    } catch {
      // storage blocked: the system theme stays
    }
  }, theme);
}

/** Loads a specimen and waits until OpenCV, Tesseract and MediaPipe have all finished. */
export async function analyseSpecimen(
  page: Page,
  sample: "Wzór: skan" | "Wzór: zdjęcie pod kątem",
) {
  await page.getByRole("button", { name: sample }).click();
  await expect(page.getByRole("status").filter({ hasText: "Analiza zakończona" })).toBeAttached({
    timeout: 90_000,
  });
}
