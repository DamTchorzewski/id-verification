import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { I18n } from "./i18n";
import { Icon } from "./icon";

/** The rear camera in a modal <dialog>; the stream stops as soon as the dialog closes. */
@Component({
  selector: "idv-camera-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <dialog
      #dialog
      aria-labelledby="camera-title"
      class="m-auto w-[min(44rem,calc(100vw-2rem))] rounded-[1.25rem] border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      (close)="stop()"
    >
      <div class="p-4 sm:p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="camera-title" class="text-lg font-semibold tracking-tight">
              {{ t().camera.title }}
            </h2>
            <p class="mt-1 text-sm text-muted">{{ t().camera.hint }}</p>
          </div>
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            [attr.aria-label]="t().camera.cancel"
            (click)="close()"
          >
            <idv-icon name="x" />
          </button>
        </div>
        <div class="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-black">
          <video
            #video
            class="size-full object-cover"
            playsinline
            muted
            [attr.aria-label]="t().camera.preview"
          ></video>
          <!-- card-shaped guide (ID-1 ratio) -->
          <div
            class="pointer-events-none absolute top-1/2 left-1/2 aspect-[85.6/54] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]"
            aria-hidden="true"
          ></div>
          @if (message()) {
            <p
              class="absolute inset-x-4 bottom-4 rounded-lg bg-black/75 px-3 py-2 text-sm text-white"
              role="status"
            >
              {{ message() }}
            </p>
          }
        </div>
        <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-ghost" (click)="close()">
            {{ t().camera.cancel }}
          </button>
          <button type="button" class="btn btn-primary" [disabled]="!live()" (click)="capture()">
            <idv-icon name="camera" [size]="18" />{{ t().camera.capture }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class CameraDialog {
  protected readonly t = inject(I18n).t;
  readonly captured = output<Blob>();
  protected readonly live = signal(false);
  protected readonly message = signal<string | null>(null);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>("video");
  private stream: MediaStream | null = null;

  async open() {
    this.dialog().nativeElement.showModal();
    this.live.set(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.message.set(this.t().camera.unsupported);
      return;
    }
    this.message.set(this.t().camera.starting);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (!this.dialog().nativeElement.open) return this.stop();
      const video = this.video().nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.message.set(null);
      this.live.set(true);
    } catch {
      this.message.set(this.t().camera.denied);
    }
  }

  protected capture() {
    const video = this.video().nativeElement;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) this.captured.emit(blob);
        this.close();
      },
      "image/jpeg",
      0.95,
    );
  }

  protected close() {
    this.dialog().nativeElement.close();
  }

  protected stop() {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.video().nativeElement.srcObject = null;
    this.live.set(false);
  }
}
