import { Injectable } from "@angular/core";
import type { ThresholdMode, VisionRequest, VisionResponse } from "../../lib/vision-protocol";

type Result = Extract<VisionResponse, { type: "result" }>;

/** Talks to the OpenCV worker. The worker (and the 10 MB OpenCV.js inside it) starts on first use. */
@Injectable({ providedIn: "root" })
export class VisionService {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (r: VisionResponse) => void; reject: (e: Error) => void }
  >();

  get loaded() {
    return this.worker !== null;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("../../workers/vision.worker", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<VisionResponse>) => {
      const waiting = this.pending.get(event.data.id);
      if (!waiting) return;
      this.pending.delete(event.data.id);
      if (event.data.type === "error") waiting.reject(new Error(event.data.message));
      else waiting.resolve(event.data);
    };
    worker.onerror = (event) => {
      for (const waiting of this.pending.values())
        waiting.reject(new Error(event.message || "worker"));
      this.pending.clear();
      this.terminate();
    };
    this.worker = worker;
    return worker;
  }

  private send(
    message: Omit<VisionRequest, "id"> | { type: "warmup" },
    transfer: Transferable[] = [],
  ) {
    const id = this.nextId++;
    return new Promise<VisionResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ensureWorker().postMessage({ id, ...message }, transfer);
    });
  }

  /** Loads OpenCV without processing anything (so the progress can say what is downloading). */
  async warmUp(): Promise<void> {
    await this.send({ type: "warmup" });
  }

  async process(image: ImageData, threshold: ThresholdMode): Promise<Result> {
    // a copy goes to the worker; the caller keeps its own image
    const copy = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    const response = await this.send({ image: copy, threshold }, [copy.data.buffer]);
    if (response.type !== "result") throw new Error("Unexpected worker response");
    return response;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}
