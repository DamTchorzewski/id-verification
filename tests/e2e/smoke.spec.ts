import { expect, test } from "@playwright/test";
import { ROUTES, trackErrors } from "./helpers";

for (const route of ROUTES) {
  test(`${route} renders the app without errors or horizontal scroll`, async ({ page }) => {
    // the unknown path itself answers 404 (with the app), which the console reports
    const errors = trackErrors(page, route === "./" ? [] : [/status of 404/]);
    const response = await page.goto(route);
    expect(response?.status()).toBe(route === "./" ? 200 : 404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    errors.expectNone();
  });
}

test("the skip link moves focus to the main content", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Przejdź do treści" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("the language and theme switches are remembered", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("before you send it");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Dark" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
