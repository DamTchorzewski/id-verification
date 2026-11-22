import { Injectable } from "@angular/core";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import { siteUrl, toCanvas } from "./images";

export interface Face {
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

/** MediaPipe face detection (BlazeFace short range), with the WebAssembly and model served by this site. */
@Injectable({ providedIn: "root" })
export class FaceService {
  private detector: Promise<FaceDetector> | null = null;

  get loaded() {
    return this.detector !== null;
  }

  private ensureDetector(): Promise<FaceDetector> {
    this.detector ??= (async () => {
      const { FaceDetector } = await import("@mediapipe/tasks-vision");
      return FaceDetector.createFromOptions(
        {
          wasmLoaderPath: siteUrl("vendor/mediapipe/vision_wasm_internal.js"),
          wasmBinaryPath: siteUrl("vendor/mediapipe/vision_wasm_internal.wasm"),
        },
        {
          baseOptions: {
            modelAssetPath: siteUrl("models/blaze_face_short_range.tflite"),
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        },
      );
    })();
    this.detector.catch(() => (this.detector = null));
    return this.detector;
  }

  async warmUp() {
    await this.ensureDetector();
  }

  async detect(image: ImageData): Promise<Face[]> {
    const detector = await this.ensureDetector();
    const { detections } = detector.detect(toCanvas(image));
    return detections
      .filter((d) => d.boundingBox)
      .map((d) => ({
        box: {
          x: d.boundingBox!.originX,
          y: d.boundingBox!.originY,
          width: d.boundingBox!.width,
          height: d.boundingBox!.height,
        },
        score: d.categories[0]?.score ?? 0,
      }))
      .sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
  }

  async terminate() {
    const detector = this.detector;
    this.detector = null;
    if (detector) (await detector).close();
  }
}
