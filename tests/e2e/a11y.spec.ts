import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { analyseSpecimen, ROUTES, setTheme } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`WCAG 2.2 AA (${colorScheme})`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });
    test.beforeEach(async ({ page }) => setTheme(page, colorScheme));

    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await page.goto(route);
        expect(await violations(page)).toEqual([]);
      });
    }

    test("after an analysis, with the MRZ checked", async ({ page }) => {
      test.setTimeout(150_000);
      await page.goto("./");
      await analyseSpecimen(page, "Wzór: zdjęcie pod kątem");
      await page.getByRole("button", { name: "TD1 zgodny z wzorem PL (wygenerowany)" }).click();
      for (const step of [/Progowanie/, /OCR/]) {
        await page.getByRole("button", { name: step }).first().click();
        expect(await violations(page)).toEqual([]);
      }
    });
  });
}
