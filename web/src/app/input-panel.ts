import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { CameraDialog } from "./camera-dialog";
import { I18n } from "./i18n";
import { Icon } from "./icon";
import { AnalysisStore } from "./services/analysis.store";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"];

@Component({
  selector: "idv-input-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, CameraDialog],
  template: `
    <div class="card relative p-3 sm:p-4">
      <h2 class="sr-only">{{ t().input.title }}</h2>
      <div
        class="relative grid min-h-64 place-items-center overflow-hidden rounded-[0.9rem] border-2 border-dashed px-6 py-10 text-center transition-colors"
        [class]="dragging() ? 'border-accent bg-accent-soft' : 'border-line bg-sunken'"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        @if (store.source() && store.urls().original; as url) {
          <img
            [src]="url"
            alt=""
            class="absolute inset-0 size-full object-cover opacity-[0.13] blur-[2px]"
          />
        }
        <div class="relative flex flex-col items-center">
          <span
            class="grid size-14 place-items-center rounded-2xl border border-line bg-surface text-accent shadow-sm"
          >
            <idv-icon name="scan" [size]="26" />
          </span>
          <p class="mt-4 text-lg font-semibold tracking-tight">{{ t().input.drop }}</p>
          <p class="mt-1 max-w-xs text-sm text-muted">{{ t().input.dropHint }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" class="btn btn-primary" (click)="fileInput.click()">
              <idv-icon name="upload" [size]="18" />{{ t().input.choose }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="cameraDialog.open()">
              <idv-icon name="camera" [size]="18" />{{ t().input.camera }}
            </button>
          </div>
          <input
            #fileInput
            type="file"
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
            [accept]="accept"
            (change)="onFile($event)"
          />
        </div>
      </div>

      <div class="mt-3 rounded-[0.9rem] border border-line p-3">
        <p class="eyebrow">{{ t().input.sample }}</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          @for (sample of samples; track sample.id) {
            <button
              type="button"
              class="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2 text-left transition-colors hover:border-line-strong hover:bg-sunken"
              (click)="useSample(sample.id)"
            >
              <img
                [src]="sample.src"
                alt=""
                width="64"
                height="44"
                class="h-11 w-16 shrink-0 rounded-md border border-line object-cover"
              />
              <span class="text-sm leading-tight font-medium">{{
                t().input.samples[sample.id]
              }}</span>
            </button>
          }
        </div>
        <p class="mt-2 text-[0.8125rem] leading-snug text-muted">{{ t().input.sampleNote }}</p>
      </div>

      @if (error()) {
        <p role="alert" class="mt-3 flex items-center gap-2 text-sm font-medium text-fail">
          <idv-icon name="alert" [size]="16" />{{ error() }}
        </p>
      }

      @if (store.source()) {
        <div class="mt-3 flex justify-end">
          <button type="button" class="btn btn-ghost min-h-10 text-sm" (click)="store.reset()">
            <idv-icon name="reset" [size]="16" />{{ t().input.reset }}
          </button>
        </div>
      }
    </div>

    <idv-camera-dialog #cameraDialog (captured)="onCaptured($event)" />
  `,
})
export class InputPanel {
  protected readonly store = inject(AnalysisStore);
  protected readonly t = inject(I18n).t;
  protected readonly accept = ACCEPT.join(",");
  protected readonly dragging = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.load(file);
  }

  protected onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) void this.load(file);
  }

  protected onCaptured(blob: Blob) {
    void this.run(() => this.store.loadBlob(blob, "camera", "camera.jpg"));
  }

  protected readonly samples = [
    { id: "scan", src: "samples/specimen-pl-id-front.jpg" },
    { id: "photo", src: "samples/specimen-pl-id-photo.jpg" },
  ] as const;

  protected useSample(sample: "scan" | "photo") {
    void this.run(() => this.store.loadSample(sample));
  }

  private load(file: File) {
    if (!file.type.startsWith("image/")) {
      this.error.set(this.t().input.wrongType);
      return;
    }
    return this.run(() => this.store.loadBlob(file, "file", file.name));
  }

  private async run(load: () => Promise<boolean>) {
    this.error.set(null);
    const ok = await load();
    if (!ok) this.error.set(this.t().input.readError);
    else document.getElementById("pipeline-title")?.scrollIntoView({ block: "start" });
  }
}
