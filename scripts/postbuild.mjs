// After `ng build`: adds the Content-Security-Policy to dist/index.html and copies it to 404.html.
// GitHub Pages cannot send headers, so the policy is a <meta> with the hash of every inline script.
// Nothing leaves the device: no external host appears anywhere in the policy. 'wasm-unsafe-eval'
// lets the MediaPipe WebAssembly compile; OpenCV and Tesseract run in workers from this origin.
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const file = new URL("../dist/index.html", import.meta.url);
let html = readFileSync(file, "utf8");

if (/\son[a-z]+="/i.test(html)) {
  console.error("postbuild: inline event handler in index.html; the CSP would block it");
  process.exit(1);
}

const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  ([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
);

const policy = [
  "default-src 'self'",
  ["script-src 'self' 'wasm-unsafe-eval'", ...hashes].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

html = html.replace(
  /<meta charset="utf-8" ?\/?>/i,
  (charset) => `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
);
if (!html.includes("Content-Security-Policy")) {
  console.error("postbuild: no <meta charset> found to put the CSP after");
  process.exit(1);
}
writeFileSync(file, html);
copyFileSync(file, new URL("../dist/404.html", import.meta.url));
console.log(`postbuild: CSP added (${hashes.length} inline script hashes), 404.html written`);
