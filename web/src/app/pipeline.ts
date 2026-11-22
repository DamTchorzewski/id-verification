import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { I18n } from "./i18n";
import { Icon, type IconName } from "./icon";
import {
  AnalysisStore,
  STEPS,
  type OcrSource,
  type StepId,
  type StepStatus,
} from "./services/analysis.store";

const STATUS_ICON: Record<StepStatus, IconName> = {
  idle: "dot",
  running: "loader",
  done: "check",
  error: "x",
  skipped: "minus",
};

@Component({
  selector: "idv-pipeline",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: "block min-w-0" },
  template: `
    <div class="card overflow-hidden">
      <div
        class="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 pt-5 pb-4"
      >
        <div>
          <h2 id="pipeline-title" class="scroll-mt-24 text-xl font-semibold tracking-tight">
            {{ t().pipeline.title }}
          </h2>
          <p class="mt-1 max-w-prose text-sm text-muted">{{ t().pipeline.lead }}</p>
        </div>
        @if (store.running()) {
          <p class="flex items-center gap-2 font-mono text-xs text-accent">
            <idv-icon name="loader" [size]="15" class="motion-safe:animate-spin-slow" />
            {{
              store.downloading()
                ? fill(t().pipeline.loading, { name: store.downloading()! })
                : t().pipeline.running
            }}
          </p>
        }
      </div>

      <ol
        class="flex snap-x [scrollbar-width:thin] gap-2 overflow-x-auto px-5 py-4 min-[480px]:grid min-[480px]:grid-cols-4 min-[480px]:overflow-visible 2xl:grid-cols-8"
      >
        @for (step of steps; track step; let i = $index) {
          @let state = store.steps()[step];
          <li class="w-[7.25rem] shrink-0 snap-start min-[480px]:w-auto min-[480px]:min-w-0">
            <button
              type="button"
              class="group flex size-full flex-col gap-2 rounded-xl border p-2 text-left transition-colors"
              [class]="
                store.selected() === step
                  ? 'border-accent bg-accent-soft/60'
                  : 'border-line bg-surface hover:border-line-strong'
              "
              [attr.aria-pressed]="store.selected() === step"
              (click)="store.select(step)"
            >
              <span class="checkerboard relative block aspect-[16/10] overflow-hidden rounded-md">
                @if (thumb(step); as url) {
                  <img [src]="url" alt="" class="size-full object-cover" />
                }
              </span>
              <span class="flex items-center justify-between gap-1">
                <span class="font-mono text-[0.6875rem] text-muted">{{
                  (i + 1).toString().padStart(2, "0")
                }}</span>
                <span
                  class="inline-flex items-center gap-1 font-mono text-[0.6875rem]"
                  [class]="statusColor(state.status)"
                >
                  <idv-icon
                    [name]="statusIcon[state.status]"
                    [size]="12"
                    [stroke]="2.25"
                    [class.motion-safe:animate-spin-slow]="state.status === 'running'"
                  />
                  @if (state.status === "done" && state.ms !== undefined) {
                    {{ state.ms }} ms
                  } @else if (state.status === "running" && state.progress) {
                    {{ (state.progress * 100).toFixed(0) }}%
                  } @else {
                    {{ t().pipeline.status[state.status] }}
                  }
                </span>
              </span>
              <span class="text-sm leading-tight font-medium">{{
                t().pipeline.steps[step].title
              }}</span>
            </button>
          </li>
        }
      </ol>

      <div class="px-5 pb-5">
        @let step = store.selected();
        <figure class="m-0">
          <div class="checkerboard relative overflow-hidden rounded-xl border border-line">
            @if (viewerUrl(); as url) {
              <div class="relative mx-auto w-fit max-w-full">
                <img
                  [src]="url"
                  [alt]="fill(t().pipeline.viewerAlt, { step: t().pipeline.steps[step].title })"
                  class="block max-h-[34rem] w-auto max-w-full"
                />
                @if (overlay(); as o) {
                  <svg
                    class="pointer-events-none absolute inset-0 size-full"
                    [attr.viewBox]="'0 0 ' + o.width + ' ' + o.height"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    @for (box of o.boxes; track $index) {
                      <rect
                        [attr.x]="box.x"
                        [attr.y]="box.y"
                        [attr.width]="box.width"
                        [attr.height]="box.height"
                        [attr.rx]="o.round"
                        fill="none"
                        [attr.stroke]="box.weak ? 'oklch(0.8 0.15 80)' : 'oklch(0.75 0.14 182)'"
                        [attr.stroke-width]="o.stroke"
                        vector-effect="non-scaling-stroke"
                      />
                    }
                  </svg>
                }
              </div>
            } @else {
              <div class="grid aspect-[16/9] place-items-center text-muted">
                <idv-icon name="image" [size]="32" [stroke]="1.25" />
              </div>
            }
            @if (store.steps()[step].status === "running") {
              <div
                class="pointer-events-none absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_24px_4px_var(--color-accent)] motion-safe:animate-scan motion-reduce:top-1/2"
                aria-hidden="true"
              ></div>
            }
          </div>
          <figcaption class="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div>
              <p class="font-medium">{{ t().pipeline.steps[step].title }}</p>
              <p class="mt-1 text-sm text-muted">{{ t().pipeline.steps[step].text }}</p>
              @if (step === "outline" || step === "warped") {
                @if (store.outlineFound() === false) {
                  <p
                    class="mt-3 flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-ink"
                  >
                    <idv-icon name="alert" [size]="16" class="mt-0.5 text-warn" />{{
                      t().pipeline.noOutline
                    }}
                  </p>
                } @else if (store.outlineFound()) {
                  <p class="mt-3 flex items-center gap-2 text-sm text-pass">
                    <idv-icon name="check" [size]="16" />{{ t().pipeline.outlineFound }}
                  </p>
                }
              }
            </div>

            @if (step === "threshold") {
              <fieldset class="grid gap-3 rounded-xl border border-line p-3 md:w-72">
                <legend class="px-1 text-sm font-medium">{{ t().pipeline.thresholdMode }}</legend>
                <div class="flex gap-2">
                  <label class="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="threshold-mode"
                      class="size-4 accent-[var(--color-accent)]"
                      [checked]="store.threshold().kind === 'otsu'"
                      [disabled]="store.running()"
                      (change)="store.setThreshold({ kind: 'otsu' })"
                    />
                    {{ t().pipeline.otsu }}
                  </label>
                  <label class="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="threshold-mode"
                      class="size-4 accent-[var(--color-accent)]"
                      [checked]="store.threshold().kind === 'manual'"
                      [disabled]="store.running()"
                      (change)="store.setThreshold({ kind: 'manual', value: manualValue() })"
                    />
                    {{ t().pipeline.manual }}
                  </label>
                </div>
                <label class="grid gap-1 text-sm">
                  <span class="flex justify-between">
                    <span>{{ t().pipeline.thresholdValue }}</span>
                    <output class="font-mono">{{ manualValue() }}</output>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    step="1"
                    class="accent-[var(--color-accent)]"
                    [value]="manualValue()"
                    [disabled]="store.threshold().kind !== 'manual' || store.running()"
                    (input)="manualValue.set(+$any($event.target).value)"
                    (change)="store.setThreshold({ kind: 'manual', value: manualValue() })"
                  />
                </label>
                @if (store.thresholdUsed() !== null) {
                  <p class="font-mono text-xs text-muted">
                    {{ fill(t().pipeline.thresholdUsed, { value: store.thresholdUsed()! }) }}
                  </p>
                }
              </fieldset>
            }

            @if (step === "ocr") {
              <div class="grid gap-3 md:w-72">
                <label class="grid gap-1 text-sm">
                  <span class="font-medium">{{ t().ocr.source }}</span>
                  <select
                    class="field"
                    [value]="store.ocrSource()"
                    [disabled]="store.running()"
                    (change)="store.setOcrSource($any($event.target).value)"
                  >
                    @for (source of ocrSources; track source) {
                      <option [value]="source">{{ t().ocr.sources[source] }}</option>
                    }
                  </select>
                </label>
                <label class="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    class="size-4 accent-[var(--color-accent)]"
                    [checked]="showBoxes()"
                    (change)="showBoxes.set(!showBoxes())"
                  />
                  {{ t().pipeline.showBoxes }}
                </label>
              </div>
            }
          </figcaption>
        </figure>
      </div>
    </div>
  `,
})
export class Pipeline {
  protected readonly store = inject(AnalysisStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fill = this.i18n.fill;
  protected readonly steps = STEPS;
  protected readonly statusIcon = STATUS_ICON;
  protected readonly ocrSources: OcrSource[] = ["warpedGray", "warped", "threshold"];
  protected readonly manualValue = signal(128);
  protected readonly showBoxes = signal(true);

  /** The image each step shows: OCR on its source image, faces on the original. */
  protected thumb(step: StepId): string | undefined {
    const urls = this.store.urls();
    if (step === "ocr") return this.store.ocrUrl() ?? undefined;
    if (step === "faces") return this.store.faceImage()?.url;
    return urls[step];
  }

  protected readonly viewerUrl = computed(() => {
    const step = this.store.selected();
    const urls = this.store.urls();
    if (step === "ocr") return this.store.ocrUrl() ?? undefined;
    if (step === "faces") return this.store.faceImage()?.url;
    return urls[step];
  });

  protected readonly overlay = computed(() => {
    const step = this.store.selected();
    if (step === "ocr" && this.showBoxes()) {
      const ocr = this.store.ocr();
      const size = this.store.ocrSize();
      if (!ocr || !size) return null;
      return {
        ...size,
        stroke: 1.5,
        round: 2,
        boxes: ocr.words.map((w) => ({ ...w.box, weak: w.confidence < 60 })),
      };
    }
    if (step === "faces") {
      const faces = this.store.faces();
      const image = this.store.faceImage();
      if (!faces || !image) return null;
      return {
        width: image.width,
        height: image.height,
        stroke: 3,
        round: 6,
        boxes: faces.map((f) => ({ ...f.box, weak: false })),
      };
    }
    return null;
  });

  protected statusColor(status: StepStatus) {
    return {
      idle: "text-muted",
      running: "text-accent",
      done: "text-pass",
      error: "text-fail",
      skipped: "text-muted",
    }[status];
  }
}
