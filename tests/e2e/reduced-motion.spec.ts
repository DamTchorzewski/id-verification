import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("nothing keeps moving with prefers-reduced-motion: reduce", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Wzór: skan" }).click();
  // while the steps run, the scan line and the spinners would animate
  await expect(page.getByText("Analiza w toku").or(page.getByText(/Pobieranie/))).toBeVisible();
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === "running" && Number(a.effect?.getComputedTiming().duration ?? 0) > 50,
        ).length,
  );
  expect(running).toBe(0);
});
