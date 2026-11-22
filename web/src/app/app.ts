import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FacesPanel } from "./faces-panel";
import { I18n, type Lang } from "./i18n";
import { Icon, type IconName } from "./icon";
import { InputPanel } from "./input-panel";
import { MrzPanel } from "./mrz-panel";
import { OcrPanel } from "./ocr-panel";
import { Pipeline } from "./pipeline";
import { ResultCard } from "./result-card";
import { AnalysisStore } from "./services/analysis.store";
import { ThemeService, type Theme } from "./theme";

@Component({
  selector: "idv-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, InputPanel, Pipeline, ResultCard, OcrPanel, MrzPanel, FacesPanel],
  template: `
    <a
      href="#main"
      class="sr-only z-50 rounded-lg bg-accent px-4 py-2 font-medium text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >{{ t().skip }}</a
    >

    <header
      class="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70"
    >
      <div
        class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <a href="./" class="group flex items-center gap-2.5 rounded-lg">
          <span
            class="grid size-9 place-items-center rounded-[10px] bg-ink text-canvas transition-transform group-hover:-rotate-3"
          >
            <idv-icon name="card" [size]="20" />
          </span>
          <!-- on narrow phones only the mark shows; the name stays for screen readers -->
          <span class="sr-only items-baseline gap-2 min-[440px]:not-sr-only min-[440px]:flex">
            <span class="text-[1.05rem] font-semibold tracking-tight whitespace-nowrap"
              >id-verification</span
            >
            <span
              class="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[0.6875rem] tracking-wide text-muted uppercase sm:inline"
              >{{ t().brandTag }}</span
            >
          </span>
        </a>

        <div class="flex items-center gap-2">
          <div
            role="group"
            [attr.aria-label]="t().nav.language"
            class="flex rounded-xl border border-line bg-surface p-1"
          >
            @for (option of langs; track option) {
              <button
                type="button"
                class="min-h-9 min-w-10 rounded-lg px-2.5 font-mono text-xs font-medium uppercase transition-colors"
                [class]="
                  i18n.lang() === option ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'
                "
                [attr.aria-pressed]="i18n.lang() === option"
                [attr.lang]="option"
                (click)="i18n.lang.set(option)"
              >
                {{ option }}
              </button>
            }
          </div>
          <div
            role="group"
            [attr.aria-label]="t().nav.theme"
            class="flex rounded-xl border border-line bg-surface p-1"
          >
            @for (option of themes; track option.value) {
              <button
                type="button"
                class="grid size-9 place-items-center rounded-lg transition-colors"
                [class]="
                  theme.theme() === option.value
                    ? 'bg-ink text-canvas'
                    : 'text-muted hover:text-ink'
                "
                [attr.aria-pressed]="theme.theme() === option.value"
                [attr.aria-label]="t().nav.themes[option.value]"
                [attr.title]="t().nav.themes[option.value]"
                (click)="theme.theme.set(option.value)"
              >
                <idv-icon [name]="option.icon" [size]="17" />
              </button>
            }
          </div>
        </div>
      </div>
    </header>

    <main id="main" tabindex="-1" class="outline-none">
      <section class="relative overflow-hidden" aria-labelledby="hero-title">
        <div class="scan-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true"></div>
        <div
          class="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-12 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:px-8 lg:pb-20"
        >
          <div>
            <p class="eyebrow flex items-center gap-2">
              <span class="inline-block size-1.5 rounded-full bg-accent"></span
              >{{ t().hero.eyebrow }}
            </p>
            <h1
              id="hero-title"
              class="mt-4 max-w-[18ch] text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.6rem]"
            >
              {{ t().hero.title }}
            </h1>
            <p class="mt-5 max-w-[58ch] text-lg leading-relaxed text-pretty text-muted">
              {{ t().hero.lead }}
            </p>
            <ul class="mt-8 grid gap-3 sm:max-w-xl">
              @for (item of t().hero.privacy; track $index) {
                <li class="flex items-start gap-3 text-[0.9375rem]">
                  <span
                    class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft text-accent"
                  >
                    <idv-icon [name]="privacyIcons[$index] ?? 'check'" [size]="15" [stroke]="2" />
                  </span>
                  <span>{{ item }}</span>
                </li>
              }
            </ul>
          </div>
          <idv-input-panel />
        </div>
      </section>

      @if (store.source()) {
        <section
          class="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-8"
          aria-labelledby="pipeline-title"
        >
          <idv-pipeline />
          <idv-result-card class="lg:row-span-2" />
          <div class="grid gap-6 xl:grid-cols-2">
            <idv-ocr-panel />
            <idv-faces-panel />
          </div>
        </section>
      }

      <section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="mrz-title">
        <idv-mrz-panel />
      </section>
    </main>

    <footer class="border-t border-line">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8"
      >
        <div class="max-w-2xl space-y-2">
          <p>{{ t().footer.status }}</p>
          <p>{{ t().footer.libraries }}</p>
        </div>
        <a
          class="btn btn-ghost shrink-0 self-start"
          href="https://github.com/DamTchorzewski/id-verification"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t().footer.source }}
          <idv-icon name="external" [size]="16" />
        </a>
      </div>
    </footer>

    <div class="sr-only" aria-live="polite" role="status">{{ store.announcement() }}</div>
  `,
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(ThemeService);
  protected readonly store = inject(AnalysisStore);
  protected readonly t = this.i18n.t;

  protected readonly langs: Lang[] = ["pl", "en"];
  protected readonly themes: Array<{ value: Theme; icon: IconName }> = [
    { value: "system", icon: "monitor" },
    { value: "light", icon: "sun" },
    { value: "dark", icon: "moon" },
  ];
  protected readonly privacyIcons: IconName[] = ["lock", "cpu", "alert"];
}
