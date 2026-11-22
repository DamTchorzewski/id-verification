/// <reference lib="webworker" />
// OpenCV.js runs here, off the main thread: the same steps as openCv/verifyID.py and
// imageTransform.py (grayscale, binary threshold with a morphological opening, Canny edges), plus
// finding the document outline and straightening it for OCR. Images arrive and leave as ImageData;
// nothing is stored.
import * as cvImport from "@techstark/opencv-js";
import type { Point, VisionImages, VisionRequest, VisionResponse } from "../lib/vision-protocol";

type CV = typeof cvImport;
type Mat = InstanceType<CV["Mat"]>;

const scope = self as unknown as DedicatedWorkerGlobalScope;

// ID-1 cards (ID cards, driving licences) are 85.60 × 53.98 mm
const ID1_RATIO = 85.6 / 53.98;

// The Emscripten module has its own `then`, so it is never returned from an async function or
// awaited directly: resolving a promise with it would call that `then` forever. It travels in a box.
let ready: Promise<{ cv: CV }> | null = null;

function loadOpenCv(): Promise<{ cv: CV }> {
  ready ??= new Promise((resolve, reject) => {
    const exported = (cvImport as unknown as { default?: unknown }).default ?? cvImport;
    if (exported instanceof Promise) {
      exported.then((cv: CV) => resolve({ cv }), reject);
      return;
    }
    const module = exported as CV & { onRuntimeInitialized?: () => void };
    if (typeof module.Mat === "function") resolve({ cv: module });
    else module.onRuntimeInitialized = () => resolve({ cv: module });
  });
  return ready;
}

function toImageData(cv: CV, mat: Mat): ImageData {
  const rgba = new cv.Mat();
  if (mat.channels() === 1) cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA);
  else mat.copyTo(rgba);
  const data = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);
  rgba.delete();
  return data;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Orders four corners as top-left, top-right, bottom-right, bottom-left. */
function orderCorners(points: Point[]): Point[] {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0]!, byDiff[0]!, bySum[3]!, byDiff[3]!];
}

/** The largest convex four-cornered contour covering at least a fifth of the frame. */
function findDocument(cv: CV, edges: Mat): Point[] | null {
  const dilated = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  cv.dilate(edges, dilated, kernel);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  const minArea = edges.rows * edges.cols * 0.2;
  const candidates: Array<{ area: number; index: number }> = [];
  for (let i = 0; i < contours.size(); i++) {
    const area = cv.contourArea(contours.get(i));
    if (area >= minArea) candidates.push({ area, index: i });
  }
  candidates.sort((a, b) => b.area - a.area);
  let quad: Point[] | null = null;
  for (const { index } of candidates.slice(0, 5)) {
    const contour = contours.get(index);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);
    if (approx.rows === 4 && cv.isContourConvex(approx)) {
      const points: Point[] = [];
      for (let p = 0; p < 4; p++)
        points.push({ x: approx.data32S[p * 2]!, y: approx.data32S[p * 2 + 1]! });
      quad = orderCorners(points);
    }
    approx.delete();
    if (quad) break;
  }
  // A quad that is nearly the whole frame is the photo's border, not a document edge.
  if (quad) {
    const inset = Math.min(edges.cols, edges.rows) * 0.01;
    const atBorder = quad.every(
      (p) => p.x <= inset || p.y <= inset || p.x >= edges.cols - inset || p.y >= edges.rows - inset,
    );
    if (atBorder) quad = null;
  }
  dilated.delete();
  kernel.delete();
  contours.delete();
  hierarchy.delete();
  return quad;
}

function warp(cv: CV, src: Mat, quad: Point[]): Mat {
  const [tl, tr, br, bl] = quad as [Point, Point, Point, Point];
  let width = Math.round(Math.max(distance(tl, tr), distance(bl, br)));
  let height = Math.round(Math.max(distance(tl, bl), distance(tr, br)));
  // close to the ID-1 shape: snap to it, which undoes most of the perspective squeeze
  const ratio = width / height;
  if (Math.abs(ratio - ID1_RATIO) / ID1_RATIO < 0.25) height = Math.round(width / ID1_RATIO);
  width = Math.max(width, 1);
  height = Math.max(height, 1);
  const from = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    quad.flatMap((p) => [p.x, p.y]),
  );
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
  const matrix = cv.getPerspectiveTransform(from, to);
  const out = new cv.Mat();
  cv.warpPerspective(src, out, matrix, new cv.Size(width, height), cv.INTER_LINEAR);
  from.delete();
  to.delete();
  matrix.delete();
  return out;
}

async function process({ id, image, threshold }: VisionRequest): Promise<VisionResponse> {
  const { cv } = await loadOpenCv();
  const timings = {} as Record<Exclude<keyof VisionImages, "warpedGray">, number>;
  const mats: Mat[] = [];
  const keep = (mat: Mat) => (mats.push(mat), mat);
  const timed = <T>(step: keyof typeof timings, run: () => T): T => {
    const start = performance.now();
    const result = run();
    timings[step] = Math.round(performance.now() - start);
    return result;
  };

  try {
    const src = keep(cv.matFromImageData(image));

    const gray = timed("grayscale", () => {
      const out = keep(new cv.Mat());
      cv.cvtColor(src, out, cv.COLOR_RGBA2GRAY);
      return out;
    });

    let thresholdValue = 0;
    const binary = timed("threshold", () => {
      const raw = keep(new cv.Mat());
      thresholdValue =
        threshold.kind === "otsu"
          ? cv.threshold(gray, raw, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU)
          : cv.threshold(gray, raw, threshold.value, 255, cv.THRESH_BINARY);
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const out = keep(new cv.Mat());
      cv.morphologyEx(raw, out, cv.MORPH_OPEN, kernel);
      kernel.delete();
      return out;
    });

    const edges = timed("edges", () => {
      const blurred = keep(new cv.Mat());
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      const out = keep(new cv.Mat());
      cv.Canny(blurred, out, 75, 200);
      return out;
    });

    let quad: Point[] | null = null;
    const outline = timed("outline", () => {
      quad = findDocument(cv, edges);
      const out = keep(src.clone());
      if (quad) {
        const points = cv.matFromArray(
          4,
          1,
          cv.CV_32SC2,
          quad.flatMap((p) => [p.x, p.y]),
        );
        const polygons = new cv.MatVector();
        polygons.push_back(points);
        const thickness = Math.max(3, Math.round(Math.max(src.cols, src.rows) / 250));
        cv.polylines(out, polygons, true, new cv.Scalar(20, 184, 166, 255), thickness, cv.LINE_AA);
        polygons.delete();
        points.delete();
      }
      return out;
    });

    // TypeScript cannot see the assignment inside the callback above
    const corners = quad as Point[] | null;
    const warped = timed("warped", () => (corners ? keep(warp(cv, src, corners)) : src));
    const warpedGray = keep(new cv.Mat());
    cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);

    const images: VisionImages = {
      grayscale: toImageData(cv, gray),
      threshold: toImageData(cv, binary),
      edges: toImageData(cv, edges),
      outline: toImageData(cv, outline),
      warped: toImageData(cv, warped),
      warpedGray: toImageData(cv, warpedGray),
    };
    return { id, type: "result", images, thresholdValue, quad: corners, timings };
  } finally {
    for (const mat of mats) mat.delete();
  }
}

scope.onmessage = async (event: MessageEvent<VisionRequest | { id: number; type: "warmup" }>) => {
  const { id } = event.data;
  try {
    if ("type" in event.data) {
      const start = performance.now();
      await loadOpenCv();
      scope.postMessage({ id, type: "ready", ms: Math.round(performance.now() - start) });
      return;
    }
    const response = await process(event.data);
    const transfer =
      response.type === "result" ? Object.values(response.images).map((i) => i.data.buffer) : [];
    scope.postMessage(response, transfer);
  } catch (error) {
    const message =
      typeof error === "number"
        ? `OpenCV exception ${error}`
        : error instanceof Error
          ? error.message
          : String(error);
    scope.postMessage({ id, type: "error", message } satisfies VisionResponse);
  }
};
