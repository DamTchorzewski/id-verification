import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { COUNTRIES } from "../lib/country";
import { NOT_CHECKED, type CheckStatus, type ReportItem } from "../lib/report";
import { I18n } from "./i18n";
import { Icon, type IconName } from "./icon";
import { AnalysisStore } from "./services/analysis.store";

const STATUS_STYLE: Record<CheckStatus, { icon: IconName; chip: string }> = {
  pass: { icon: "check", chip: "bg-pass-soft text-pass" },
  fail: { icon: "x", chip: "bg-fail-soft text-fail" },
  warn: { icon: "alert", chip: "bg-warn-soft text-warn" },
  info: { icon: "info", chip: "bg-info-soft text-info" },
};

@Component({
  selector: "idv-result-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: "block min-w-0" },
  template: `
    <aside class="card lg:sticky lg:top-20" aria-labelledby="result-title">
      <div class="border-b border-line p-5">
        <div class="flex items-center justify-between gap-3">
          <h2 id="result-title" class="text-xl font-semibold tracking-tight">
            {{ t().result.title }}
          </h2>
          <span
            class="rounded-full border border-line px-2.5 py-1 font-mono text-[0.6875rem] tracking-wide text-muted uppercase"
          >
            {{ t().result.badge }}
          </span>
        </div>

        @let s = store.summary();
        <div class="mt-4 flex items-end gap-3">
          <p class="font-mono text-5xl leading-none font-medium tracking-tight tabular-nums">
            {{ s.pass }}<span class="text-2xl text-muted">/{{ s.total }}</span>
          </p>
          <p class="pb-1 text-sm text-muted">{{ fill(t().result.summary, s) }}</p>
        </div>
        <div class="mt-3 flex h-2 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
          @for (item of store.report(); track item.id) {
            <span
              class="h-full flex-1 border-r-2 border-surface last:border-r-0"
              [class]="barColor(item.status)"
            ></span>
          }
        </div>

        <label class="mt-5 grid gap-1.5 text-sm">
          <span class="font-medium">{{ t().country.label }}</span>
          <select
            class="field"
            [value]="store.countryCode()"
            (change)="store.countryCode.set($any($event.target).value)"
          >
            @for (country of countries; track country.code) {
              <option [value]="country.code">
                {{ country.name[i18n.lang()] }} ({{ country.code }})
              </option>
            }
          </select>
          <span class="text-xs text-muted">{{ t().country.hint }}</span>
        </label>
      </div>

      <div class="p-5">
        <h3 class="eyebrow">{{ t().result.checked }}</h3>
        @if (store.report().length) {
          <ul class="mt-3 grid gap-2.5">
            @for (item of store.report(); track item.id) {
              <li class="flex gap-3">
                <span
                  class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md"
                  [class]="style[item.status].chip"
                >
                  <idv-icon [name]="style[item.status].icon" [size]="14" [stroke]="2.25" />
                </span>
                <span class="min-w-0 text-sm">
                  <span class="block font-medium">{{ title(item) }}</span>
                  <span class="block text-muted">
                    <span class="sr-only">{{ t().result.statuses[item.status] }}: </span
                    >{{ detail(item) }}
                  </span>
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-3 text-sm text-muted">{{ t().result.waiting }}</p>
        }

        <h3 class="eyebrow mt-6">{{ t().result.notChecked }}</h3>
        <ul class="mt-3 grid gap-2">
          @for (id of notChecked; track id) {
            <li class="flex gap-3 text-sm text-muted">
              <span
                class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-dashed border-line-strong"
              >
                <idv-icon name="minus" [size]="14" />
              </span>
              {{ t().result.notCheckedItems[id] }}
            </li>
          }
        </ul>

        <p class="mt-6 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm leading-snug">
          {{ t().result.disclaimer }}
        </p>

        <button
          type="button"
          class="btn btn-ghost mt-4 w-full"
          [disabled]="!store.report().length || store.running()"
          (click)="download()"
        >
          <idv-icon name="download" [size]="18" />{{ t().result.export }}
        </button>
        <p class="mt-2 text-center text-xs text-muted">{{ t().result.exportNote }}</p>
      </div>
    </aside>
  `,
})
export class ResultCard {
  protected readonly store = inject(AnalysisStore);
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fill = this.i18n.fill;
  protected readonly style = STATUS_STYLE;
  protected readonly notChecked = NOT_CHECKED;
  protected readonly countries = COUNTRIES;

  private readonly checks = computed(() => this.t().result.checks);

  protected title(item: ReportItem) {
    return this.fill(this.checks()[item.id].title, item.params);
  }

  protected detail(item: ReportItem) {
    const texts: { detail?: string } & Partial<Record<CheckStatus, string>> =
      this.checks()[item.id];
    return this.fill(
      texts[item.status] ?? texts.detail ?? this.t().result.statuses[item.status],
      item.params,
    );
  }

  protected barColor(status: CheckStatus) {
    return { pass: "bg-pass", fail: "bg-fail", warn: "bg-warn", info: "bg-info" }[status];
  }

  protected download() {
    const url = URL.createObjectURL(this.store.exportReport());
    const link = document.createElement("a");
    link.href = url;
    link.download = `id-verification-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
