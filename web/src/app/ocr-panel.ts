import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { I18n } from "./i18n";
import { Icon } from "./icon";
import { AnalysisStore } from "./services/analysis.store";

@Component({
  selector: "idv-ocr-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: "block min-w-0" },
  template: `
    <section class="card h-full p-5" aria-labelledby="ocr-title">
      <div class="flex items-start justify-between gap-3">
        <h2 id="ocr-title" class="text-lg font-semibold tracking-tight">{{ t().ocr.title }}</h2>
        @if (store.ocr()?.text) {
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-ink"
            [attr.aria-label]="t().ocr.copy"
            [attr.title]="t().ocr.copy"
            (click)="copy()"
          >
            <idv-icon name="copy" [size]="17" />
          </button>
        }
      </div>
      @if (store.ocr(); as ocr) {
        <p class="mt-1 flex flex-wrap gap-x-4 font-mono text-xs text-muted">
          <span>{{ fill(t().ocr.confidence, { value: ocr.confidence.toFixed(0) }) }}</span>
          <span>{{ fill(t().ocr.words, { value: ocr.words.length }) }}</span>
        </p>
        @if (ocr.text) {
          <pre
            class="mt-4 max-h-80 overflow-auto rounded-xl border border-line bg-sunken p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap"
            tabindex="0"
            [attr.aria-label]="t().ocr.title"
            >{{ ocr.text }}</pre>
        } @else {
          <p class="mt-4 text-sm text-muted">{{ t().ocr.empty }}</p>
        }
      } @else {
        <div class="mt-4 grid gap-2" aria-hidden="true">
          @for (w of [92, 70, 84, 46, 64]; track $index) {
            <span
              class="h-3 rounded bg-sunken motion-safe:animate-pulse"
              [style.width.%]="w"
            ></span>
          }
        </div>
      }
    </section>
  `,
})
export class OcrPanel {
  protected readonly store = inject(AnalysisStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fill = this.i18n.fill;

  protected async copy() {
    const text = this.store.ocr()?.text;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    this.store.announcement.set(this.t().ocr.copied);
  }
}
