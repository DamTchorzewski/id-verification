import { Injectable } from "@angular/core";
import type { Worker as TesseractWorker } from "tesseract.js";
import { siteUrl, toCanvas } from "./images";

export interface OcrWord {
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: OcrWord[];
}

const MRZ_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

/**
 * Tesseract.js with every file served by this site (worker, WebAssembly core, language data):
 * nothing is fetched from a CDN and nothing is cached in IndexedDB.
 */
@Injectable({ providedIn: "root" })
export class OcrService {
  private worker: Promise<TesseractWorker> | null = null;
  private onProgress: ((progress: number) => void) | null = null;

  get loaded() {
    return this.worker !== null;
  }

  private ensureWorker(): Promise<TesseractWorker> {
    this.worker ??= (async () => {
      // a CommonJS package: the named exports sit on `default` after bundling
      const imported = await import("tesseract.js");
      const { createWorker, OEM } =
        (imported as unknown as { default?: typeof imported }).default ?? imported;
      return createWorker(["pol", "eng"], OEM.LSTM_ONLY, {
        workerPath: siteUrl("vendor/tesseract/worker.min.js"),
        corePath: siteUrl("vendor/tesseract/core/"),
        langPath: siteUrl("vendor/tesseract/lang"),
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (message) => {
          if (message.status === "recognizing text") this.onProgress?.(message.progress);
        },
      });
    })();
    this.worker.catch(() => (this.worker = null));
    return this.worker;
  }

  async warmUp() {
    await this.ensureWorker();
  }

  async recognize(image: ImageData, onProgress?: (progress: number) => void): Promise<OcrResult> {
    const worker = await this.ensureWorker();
    this.onProgress = onProgress ?? null;
    try {
      // sparse text (PSM 11) reads the scattered fields of a card far better than page layout (PSM 3)
      await worker.setParameters({
        tessedit_char_whitelist: "",
        tessedit_pageseg_mode: "11" as never,
      });
      const { data } = await worker.recognize(toCanvas(image), {}, { text: true, blocks: true });
      const words: OcrWord[] = [];
      for (const block of data.blocks ?? [])
        for (const paragraph of block.paragraphs)
          for (const line of paragraph.lines)
            for (const word of line.words)
              if (word.text.trim())
                words.push({
                  text: word.text,
                  confidence: word.confidence,
                  box: {
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width: word.bbox.x1 - word.bbox.x0,
                    height: word.bbox.y1 - word.bbox.y0,
                  },
                });
      const confidence = words.length
        ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
        : 0;
      // sparse mode returns one fragment per line; lines without a word or a number are noise
      // from the guilloche background
      const text = data.text
        .split("\n")
        .filter((line) => /[\p{L}\p{N}]{2,}/u.test(line))
        .join("\n");
      return { text, confidence, words };
    } finally {
      this.onProgress = null;
    }
  }

  /** A second pass over the bottom of the document with only MRZ characters allowed. */
  async readMrzBand(image: ImageData): Promise<string> {
    const worker = await this.ensureWorker();
    const top = Math.round(image.height * 0.55);
    await worker.setParameters({
      tessedit_char_whitelist: MRZ_ALPHABET,
      tessedit_pageseg_mode: "6" as never,
    });
    try {
      const { data } = await worker.recognize(toCanvas(image), {
        rectangle: { left: 0, top, width: image.width, height: image.height - top },
      });
      return data.text;
    } finally {
      await worker.setParameters({
        tessedit_char_whitelist: "",
        tessedit_pageseg_mode: "11" as never,
      });
    }
  }

  async terminate() {
    const worker = this.worker;
    this.worker = null;
    if (worker) await (await worker).terminate();
  }
}
