import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { I18n } from "./i18n";
import { AnalysisStore } from "./services/analysis.store";

@Component({
  selector: "idv-faces-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block min-w-0" },
  template: `
    <section class="card h-full p-5" aria-labelledby="faces-title">
      <h2 id="faces-title" class="text-lg font-semibold tracking-tight">{{ t().faces.title }}</h2>
      @if (store.faces(); as faces) {
        <p class="mt-1 font-mono text-xs text-muted">
          {{ fill(t().faces.count, { value: faces.length }) }}
        </p>
        @if (faces.length) {
          <ul class="mt-4 flex flex-wrap gap-3">
            @for (face of faces; track $index; let i = $index) {
              <li class="w-28">
                <img
                  [src]="store.faceCrops()[i]"
                  [alt]="fill(t().faces.crop, { n: i + 1, score: (face.score * 100).toFixed(0) })"
                  class="aspect-square w-full rounded-xl border border-line object-cover"
                />
                <p class="mt-1.5 text-center font-mono text-xs text-muted" aria-hidden="true">
                  {{ (face.score * 100).toFixed(0) }}%
                </p>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-4 text-sm text-muted">{{ t().faces.none }}</p>
        }
        <p class="mt-4 text-sm text-muted">{{ t().faces.note }}</p>
      } @else {
        <div class="mt-4 flex gap-3" aria-hidden="true">
          <span class="size-28 rounded-xl bg-sunken motion-safe:animate-pulse"></span>
          <span class="size-28 rounded-xl bg-sunken motion-safe:animate-pulse"></span>
        </div>
      }
    </section>
  `,
})
export class FacesPanel {
  protected readonly store = inject(AnalysisStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fill = this.i18n.fill;
}
