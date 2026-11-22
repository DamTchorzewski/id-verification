// Messages between the app and the OpenCV worker (web/src/workers/vision.worker.ts).

export type ThresholdMode = { kind: "otsu" } | { kind: "manual"; value: number };

export interface Point {
  x: number;
  y: number;
}

export interface VisionRequest {
  id: number;
  image: ImageData;
  threshold: ThresholdMode;
}

export interface VisionImages {
  grayscale: ImageData;
  threshold: ImageData;
  edges: ImageData;
  outline: ImageData;
  /** the document cut out and straightened (the whole frame when no outline was found) */
  warped: ImageData;
  /** the straightened document in grayscale: what OCR reads by default */
  warpedGray: ImageData;
}

export type VisionResponse =
  | { id: number; type: "ready"; ms: number }
  | {
      id: number;
      type: "result";
      images: VisionImages;
      /** the threshold actually used (Otsu picks it) */
      thresholdValue: number;
      /** document corners: top-left, top-right, bottom-right, bottom-left; null when not found */
      quad: Point[] | null;
      timings: Record<Exclude<keyof VisionImages, "warpedGray">, number>;
    }
  | { id: number; type: "error"; message: string };
