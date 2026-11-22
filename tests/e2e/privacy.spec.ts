import { expect, test } from "@playwright/test";
import { analyseSpecimen } from "./helpers";

// The promise of the page: the document image never leaves the device. Every request the browser
// makes during a full analysis goes to the site itself, and none of them sends a body.
test("a full analysis makes no request outside the site and uploads nothing", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const origin = new URL(baseURL!).origin;
  const requests: Array<{ url: string; method: string; body: boolean }> = [];
  page.on("request", (request) => {
    if (/^(data|blob):/.test(request.url())) return;
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData() !== null,
    });
  });
  await page.goto("./");
  await analyseSpecimen(page, "Wzór: zdjęcie pod kątem");

  expect(requests.length).toBeGreaterThan(5);
  expect(requests.filter((r) => !r.url.startsWith(origin))).toEqual([]);
  expect(requests.filter((r) => r.method !== "GET" || r.body)).toEqual([]);
});
