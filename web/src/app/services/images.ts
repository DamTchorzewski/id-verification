// Image helpers for the main thread. Everything stays in memory; object URLs are revoked by the
// store when an analysis is cleared.

/** The long side an image is scaled down to: enough for OCR of a card, light on memory. */
export const MAX_SIDE = 1600;

export async function decode(source: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height);
}

export function toCanvas(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")!.putImageData(image, 0, 0);
  return canvas;
}

export function toBlob(image: ImageData, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    toCanvas(image).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
      type,
      0.92,
    ),
  );
}

export async function toObjectUrl(image: ImageData): Promise<string> {
  return URL.createObjectURL(await toBlob(image, "image/jpeg"));
}

export function crop(
  image: ImageData,
  box: { x: number; y: number; width: number; height: number },
) {
  const canvas = toCanvas(image);
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const width = Math.max(1, Math.min(image.width - x, Math.round(box.width)));
  const height = Math.max(1, Math.min(image.height - y, Math.round(box.height)));
  return canvas.getContext("2d")!.getImageData(x, y, width, height);
}

/** The site's own base URL, so the vendor files resolve under /id-verification/ or a custom domain. */
export function siteUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}
