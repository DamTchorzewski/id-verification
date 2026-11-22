import { computed, inject, Injectable, signal } from "@angular/core";
import { COUNTRIES, matchCountry } from "../../lib/country";
import { findMrz, type MrzResult } from "../../lib/mrz";
import { buildReport, NOT_CHECKED, summarise } from "../../lib/report";
import type { Point, ThresholdMode, VisionImages } from "../../lib/vision-protocol";
import { fill, I18n } from "../i18n";
import { FaceService, type Face } from "./face.service";
import { crop, decode, siteUrl, toObjectUrl } from "./images";
import { OcrService, type OcrResult } from "./ocr.service";
import { VisionService } from "./vision.service";

export const STEPS = [
  "original",
  "grayscale",
  "threshold",
  "edges",
  "outline",
  "warped",
  "ocr",
  "faces",
] as const;
export type StepId = (typeof STEPS)[number];
export type StepStatus = "idle" | "running" | "done" | "error" | "skipped";
export type OcrSource = "warpedGray" | "warped" | "threshold";

export interface StepState {
  status: StepStatus;
  ms?: number;
  progress?: number;
}

export interface Source {
  kind: "file" | "camera" | "sample";
  name: string;
  width: number;
  height: number;
}

const idleSteps = (): Record<StepId, StepState> =>
  Object.fromEntries(STEPS.map((step) => [step, { status: "idle" }])) as Record<StepId, StepState>;

/**
 * The whole analysis as signals: the image, every intermediate result and the report. Images are
 * kept only in this tab's memory and dropped by `reset()`.
 */
@Injectable({ providedIn: "root" })
export class AnalysisStore {
  private readonly i18n = inject(I18n);
  private readonly vision = inject(VisionService);
  private readonly ocrService = inject(OcrService);
  private readonly faceService = inject(FaceService);

  readonly source = signal<Source | null>(null);
  readonly steps = signal(idleSteps());
  readonly urls = signal<Partial<Record<StepId, string>>>({});
  readonly selected = signal<StepId>("original");
  readonly running = signal(false);
  readonly downloading = signal<string | null>(null);
  readonly announcement = signal("");

  readonly threshold = signal<ThresholdMode>({ kind: "otsu" });
  readonly thresholdUsed = signal<number | null>(null);
  readonly quad = signal<Point[] | null>(null);
  readonly outlineFound = signal<boolean | null>(null);

  readonly ocrSource = signal<OcrSource>("warpedGray");
  /** the image OCR read, for the viewer and its word boxes */
  readonly ocrUrl = signal<string | null>(null);
  readonly ocr = signal<OcrResult | null>(null);
  readonly ocrSize = signal<{ width: number; height: number } | null>(null);

  /** null: not looked for; "none": looked for, not found */
  readonly mrz = signal<MrzResult | "none" | null>(null);
  readonly mrzSource = signal<"ocr" | "manual" | null>(null);

  readonly faces = signal<Face[] | null>(null);
  /** the image faces were looked for in (the straightened document when there is one) */
  readonly faceImage = signal<{ url: string; width: number; height: number } | null>(null);
  readonly faceCrops = signal<string[]>([]);

  readonly countryCode = signal("POL");
  readonly country = computed(
    () => COUNTRIES.find((c) => c.code === this.countryCode()) ?? COUNTRIES[0]!,
  );

  readonly countryMatch = computed(() => {
    const ocr = this.ocr();
    const mrz = this.mrz();
    if (!ocr && !(mrz && mrz !== "none")) return null;
    return matchCountry(this.country(), ocr?.text ?? "", mrz && mrz !== "none" ? mrz : null);
  });

  readonly report = computed(() => {
    const source = this.source();
    const match = this.countryMatch();
    return buildReport({
      image: source ? { width: source.width, height: source.height } : null,
      outlineFound: this.outlineFound(),
      ocr: this.ocr(),
      country: match ? { name: this.country().name[this.i18n.lang()], match } : null,
      mrz: this.mrz(),
      faces: this.faces()?.length ?? null,
      today: new Date(),
    });
  });
  readonly summary = computed(() => summarise(this.report()));

  private original: ImageData | null = null;
  private images: VisionImages | null = null;
  private run = 0;
  private userPicked = false;

  async loadBlob(blob: Blob, kind: Source["kind"], name: string) {
    let image: ImageData;
    try {
      image = await decode(blob);
    } catch {
      this.announce(this.i18n.t().input.readError);
      return false;
    }
    this.clear();
    this.original = image;
    this.source.set({ kind, name, width: image.width, height: image.height });
    this.urls.set({ original: await toObjectUrl(image) });
    this.patchStep("original", { status: "done" });
    void this.analyse();
    return true;
  }

  /** The WZORZEC specimen: the published scan, or the same card photographed at an angle. */
  async loadSample(sample: "scan" | "photo") {
    const name = sample === "scan" ? "specimen-pl-id-front.jpg" : "specimen-pl-id-photo.jpg";
    const response = await fetch(siteUrl(`samples/${name}`));
    return this.loadBlob(await response.blob(), "sample", name);
  }

  select(step: StepId) {
    this.userPicked = true;
    this.selected.set(step);
  }

  setThreshold(mode: ThresholdMode) {
    this.threshold.set(mode);
    if (this.original && !this.running()) void this.analyse({ fromVision: true });
  }

  setOcrSource(source: OcrSource) {
    this.ocrSource.set(source);
    if (this.images && !this.running()) void this.analyse({ fromOcr: true });
  }

  /** Checks an MRZ typed or pasted by the user; false when it is not a zone at all. */
  checkManualMrz(text: string): boolean {
    const result = findMrz(text);
    if (!result) return false;
    this.mrz.set(result);
    this.mrzSource.set("manual");
    return true;
  }

  /** Runs the pipeline; a newer run makes an older one stop writing its results. */
  async analyse(options: { fromVision?: boolean; fromOcr?: boolean } = {}) {
    const original = this.original;
    if (!original) return;
    const run = ++this.run;
    const current = () => run === this.run;
    const t = this.i18n.t();
    this.running.set(true);
    if (!options.fromVision && !options.fromOcr) this.userPicked = false;

    // 1. OpenCV: grayscale, threshold, edges, outline, straightened
    if (!options.fromOcr) {
      for (const step of ["grayscale", "threshold", "edges", "outline", "warped"] as const)
        this.patchStep(step, { status: "running" });
      try {
        if (!this.vision.loaded) this.downloading.set(t.progress.opencv);
        const result = await this.vision.process(original, this.threshold());
        if (!current()) return;
        this.images = result.images;
        this.thresholdUsed.set(Math.round(result.thresholdValue));
        this.quad.set(result.quad);
        this.outlineFound.set(result.quad !== null);
        const urls = { ...this.urls() };
        for (const step of ["grayscale", "threshold", "edges", "outline", "warped"] as const) {
          if (urls[step]) URL.revokeObjectURL(urls[step]);
          urls[step] = await toObjectUrl(result.images[step]);
          this.patchStep(step, { status: "done", ms: result.timings[step] });
        }
        this.urls.set(urls);
        this.autoSelect("warped");
      } catch (error) {
        if (!current()) return;
        for (const step of ["grayscale", "threshold", "edges", "outline", "warped"] as const)
          this.patchStep(step, { status: "error" });
        this.fail("OpenCV", error);
      } finally {
        this.downloading.set(null);
      }
    }

    // 2. Tesseract: the text, then the MRZ (from the text, or a second pass over the bottom band)
    if (this.images) {
      this.patchStep("ocr", { status: "running", progress: 0 });
      const ocrImage = this.images[this.ocrSource()];
      try {
        if (!this.ocrService.loaded) this.downloading.set(t.progress.tesseract);
        const start = performance.now();
        const result = await this.ocrService.recognize(ocrImage, (progress) => {
          this.downloading.set(null);
          if (current()) this.patchStep("ocr", { status: "running", progress });
        });
        if (!current()) return;
        this.ocr.set(result);
        this.ocrSize.set({ width: ocrImage.width, height: ocrImage.height });
        const previous = this.ocrUrl();
        if (previous) URL.revokeObjectURL(previous);
        this.ocrUrl.set(await toObjectUrl(ocrImage));
        if (this.mrzSource() !== "manual") {
          let mrz = findMrz(result.text);
          if (!mrz) mrz = findMrz(await this.ocrService.readMrzBand(this.images.warped));
          if (!current()) return;
          this.mrz.set(mrz ?? "none");
          this.mrzSource.set(mrz ? "ocr" : null);
        }
        this.patchStep("ocr", { status: "done", ms: Math.round(performance.now() - start) });
        this.autoSelect("ocr");
      } catch (error) {
        if (!current()) return;
        this.patchStep("ocr", { status: "error" });
        this.fail("OCR", error);
      } finally {
        this.downloading.set(null);
      }
    } else this.patchStep("ocr", { status: "skipped" });

    // 3. MediaPipe: faces on the straightened document, where they are largest (once per image)
    if (!options.fromOcr) {
      this.patchStep("faces", { status: "running" });
      try {
        if (!this.faceService.loaded) this.downloading.set(t.progress.mediapipe);
        const start = performance.now();
        const image = this.images?.warped ?? original;
        const faces = await this.faceService.detect(image);
        if (!current()) return;
        for (const url of this.faceCrops()) URL.revokeObjectURL(url);
        this.faces.set(faces);
        this.faceImage.set({
          url: this.urls().warped ?? this.urls().original!,
          width: image.width,
          height: image.height,
        });
        this.faceCrops.set(
          await Promise.all(faces.map((face) => toObjectUrl(crop(image, face.box)))),
        );
        this.patchStep("faces", { status: "done", ms: Math.round(performance.now() - start) });
        this.autoSelect("faces");
      } catch (error) {
        if (!current()) return;
        this.patchStep("faces", { status: "error" });
        this.fail("MediaPipe", error);
      } finally {
        this.downloading.set(null);
      }
    }

    if (!current()) return;
    this.running.set(false);
    const s = this.summary();
    this.announce(fill(t.progress.done, { summary: fill(t.result.summary, s) }));
  }

  /** Drops the image, every intermediate image and every result from memory. */
  reset() {
    this.clear();
    this.mrz.set(null);
    this.mrzSource.set(null);
    this.announce(this.i18n.t().input.resetDone);
  }

  exportReport(): Blob {
    const source = this.source();
    const mrz = this.mrz();
    const t = this.i18n.t();
    const report = {
      generatedAt: new Date().toISOString(),
      tool: "id-verification web demo (prototype, not an authenticity check)",
      source,
      declaredCountry: this.country().code,
      summary: this.summary(),
      checks: this.report().map((item) => ({
        id: item.id,
        status: item.status,
        title: fill(t.result.checks[item.id].title, item.params),
        params: item.params,
      })),
      notChecked: NOT_CHECKED.map((id) => t.result.notCheckedItems[id]),
      opencv: { thresholdUsed: this.thresholdUsed(), documentCorners: this.quad() },
      ocr: this.ocr() ? { text: this.ocr()!.text, meanConfidence: this.ocr()!.confidence } : null,
      mrz: mrz && mrz !== "none" ? { source: this.mrzSource(), ...mrz } : mrz,
      faces: this.faces()?.map((face) => ({ box: face.box, score: face.score })) ?? null,
    };
    return new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  }

  private clear() {
    this.run++;
    for (const url of [...Object.values(this.urls()), ...this.faceCrops(), this.ocrUrl()])
      if (url) URL.revokeObjectURL(url);
    this.original = null;
    this.images = null;
    this.source.set(null);
    this.steps.set(idleSteps());
    this.urls.set({});
    this.selected.set("original");
    this.userPicked = false;
    this.running.set(false);
    this.downloading.set(null);
    this.thresholdUsed.set(null);
    this.quad.set(null);
    this.outlineFound.set(null);
    this.ocr.set(null);
    this.ocrSize.set(null);
    this.ocrUrl.set(null);
    if (this.mrzSource() !== "manual") {
      this.mrz.set(null);
      this.mrzSource.set(null);
    }
    this.announcement.set("");
    this.faces.set(null);
    this.faceImage.set(null);
    this.faceCrops.set([]);
  }

  private autoSelect(step: StepId) {
    if (!this.userPicked) this.selected.set(step);
  }

  private patchStep(step: StepId, state: StepState) {
    this.steps.update((steps) => ({ ...steps, [step]: state }));
  }

  private fail(step: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${step}]`, error);
    this.announce(fill(this.i18n.t().progress.failed, { step, message }));
  }

  private announce(message: string) {
    // a change of text is what screen readers announce, so clear first
    this.announcement.set("");
    queueMicrotask(() => this.announcement.set(message));
  }
}
