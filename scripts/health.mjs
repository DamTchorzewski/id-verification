// Smoke check of the live site after a deploy: the page and every runtime it loads lazily (OpenCV is
// bundled, Tesseract, its language data, MediaPipe and the face model are served from the site).
// Read-only, no dependencies. Usage: SITE_URL=https://<owner>.github.io/id-verification/ pnpm health
const raw = process.env.SITE_URL?.trim();
if (!raw) {
  console.error("health: SITE_URL is not set");
  process.exit(1);
}
const base = raw.endsWith("/") ? raw : `${raw}/`;

const checks = [
  { path: "", status: 200, contains: "Content-Security-Policy" },
  { path: "samples/specimen-pl-id-front.jpg", status: 200 },
  { path: "samples/specimen-pl-id-photo.jpg", status: 200 },
  { path: "vendor/tesseract/worker.min.js", status: 200 },
  { path: "vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js", status: 200 },
  { path: "vendor/tesseract/lang/eng.traineddata.gz", status: 200 },
  { path: "vendor/tesseract/lang/pol.traineddata.gz", status: 200 },
  { path: "vendor/mediapipe/vision_wasm_internal.wasm", status: 200 },
  { path: "models/blaze_face_short_range.tflite", status: 200 },
  { path: "no-such-page/", status: 404, contains: "<idv-root" },
];

let failed = false;
for (const { path, status, contains } of checks) {
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "cache-control": "no-cache" },
    });
    const body = contains ? await response.text() : (await response.arrayBuffer(), "");
    const ok = response.status === status && (!contains || body.includes(contains));
    console.log(`${ok ? "ok  " : "FAIL"} ${response.status} ${url}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL ${url} (${error instanceof Error ? error.message : error})`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
