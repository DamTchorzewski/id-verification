import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { analyseSpecimen, trackErrors } from "./helpers";

test.describe.configure({ timeout: 150_000 });

test("the angled specimen photo: outline, OCR, country, face and the result card", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto("./");
  await analyseSpecimen(page, "Wzór: zdjęcie pod kątem");

  const result = page.getByRole("complementary", { name: "Wynik" });
  await expect(result).toContainText("znaleziony i wyprostowany");
  await expect(result).toContainText("Kraj w dokumencie: Polska");
  await expect(result).toContainText("nie znaleziona na tym obrazie"); // the MRZ is on the back
  await expect(result).toContainText("Chip e-dowodu (NFC)"); // listed as not checked
  await expect(page.getByRole("region", { name: "Odczytany tekst" })).toContainText("ZZC508977");
  await expect(page.getByRole("region", { name: "Wykryte twarze" })).toContainText(/Twarze: [1-9]/);

  // another declared country fails the text match, as verifyID.py prints "Invalid ID"
  await result.getByLabel("Kraj podany przez użytkownika").selectOption("DEU");
  await expect(result).toContainText("nie znaleziono w tekście ani w MRZ");

  // the report downloads as JSON with no image in it
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    result.getByRole("button", { name: "Pobierz raport JSON" }).click(),
  ]);
  const report = await readFile((await download.path())!, "utf8");
  expect(JSON.parse(report).declaredCountry).toBe("DEU");
  expect(report).not.toMatch(/data:image|blob:/);

  await page.getByRole("button", { name: "Wyczyść wszystko" }).click();
  await expect(result).toBeHidden();
  errors.expectNone();
});

test("the threshold can be set by hand and the steps run again", async ({ page }) => {
  await page.goto("./");
  await analyseSpecimen(page, "Wzór: skan");
  await page.getByRole("button", { name: /Progowanie/ }).click();
  await page.getByRole("radio", { name: "Ręczny" }).check();
  await expect(page.getByText("Użyty próg: 128")).toBeVisible({ timeout: 60_000 });
});

test("MRZ check digits: specimens pass, a changed digit fails, junk is rejected", async ({
  page,
}) => {
  await page.goto("./");
  const panel = page.locator("idv-mrz-panel");
  await panel.getByRole("button", { name: "Paszport TD3 (Utopia, ICAO)" }).click();
  await expect(panel).toContainText("5/5");
  await expect(panel).toContainText("ERIKSSON");

  const field = panel.getByLabel("MRZ do sprawdzenia (2 albo 3 linie)");
  await field.fill(
    [
      "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
      "L898902C36UTO7408132F1204159ZE184226B<<<<<10",
    ].join("\n"),
  );
  await panel.getByRole("button", { name: "Sprawdź MRZ" }).click();
  await expect(panel).toContainText("3/5");

  await field.fill("hello");
  await panel.getByRole("button", { name: "Sprawdź MRZ" }).click();
  await expect(panel.getByRole("alert")).toContainText("To nie wygląda na MRZ");
  await expect(field).toHaveAttribute("aria-invalid", "true");
});
