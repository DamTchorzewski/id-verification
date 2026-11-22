import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { SPECIMEN_MRZ, type CheckField, type MrzFormat, type MrzResult } from "../lib/mrz";
import { I18n } from "./i18n";
import { Icon } from "./icon";
import { AnalysisStore } from "./services/analysis.store";

/** Where each check digit sits: [line, column]. */
const DIGIT_POSITIONS: Record<MrzFormat, Partial<Record<CheckField, [number, number]>>> = {
  TD1: { documentNumber: [0, 14], birthDate: [1, 6], expiryDate: [1, 14], composite: [1, 29] },
  TD2: { documentNumber: [1, 9], birthDate: [1, 19], expiryDate: [1, 27], composite: [1, 35] },
  TD3: {
    documentNumber: [1, 9],
    birthDate: [1, 19],
    expiryDate: [1, 27],
    optional: [1, 42],
    composite: [1, 43],
  },
};

type FieldKey = keyof ReturnType<I18n["t"]>["mrz"]["fields"];
const FIELDS: FieldKey[] = [
  "documentCode",
  "issuingState",
  "documentNumber",
  "surname",
  "givenNames",
  "nationality",
  "birthDate",
  "sex",
  "expiryDate",
  "optionalData",
];

@Component({
  selector: "idv-mrz-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: "block" },
  template: `
    <div class="card overflow-hidden">
      <div class="grid gap-6 p-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8 lg:p-6">
        <div>
          <h2 id="mrz-title" class="text-xl font-semibold tracking-tight">{{ t().mrz.title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">{{ t().mrz.lead }}</p>
          @if (store.mrz() === "none" && store.mrzSource() !== "manual") {
            <p class="mt-4 flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-sm">
              <idv-icon name="info" [size]="16" class="mt-0.5 text-info" />{{ t().mrz.notFound }}
            </p>
          }

          <form class="mt-5 grid gap-2" (submit)="check($event)">
            <label for="mrz-input" class="text-sm font-medium">{{ t().mrz.paste }}</label>
            <textarea
              id="mrz-input"
              rows="3"
              spellcheck="false"
              wrap="off"
              autocomplete="off"
              autocapitalize="characters"
              class="field resize-y font-mono text-[0.8125rem] leading-relaxed tracking-wider uppercase"
              aria-describedby="mrz-hint mrz-error"
              [attr.aria-invalid]="invalid() ? 'true' : null"
              [value]="draft()"
              (input)="draft.set($any($event.target).value); invalid.set(false)"
            ></textarea>
            <p id="mrz-hint" class="text-xs text-muted">{{ t().mrz.pasteHint }}</p>
            @if (invalid()) {
              <p
                id="mrz-error"
                role="alert"
                class="flex items-center gap-2 text-sm font-medium text-fail"
              >
                <idv-icon name="alert" [size]="16" />{{ t().mrz.invalidInput }}
              </p>
            }
            <button
              type="submit"
              class="btn btn-primary mt-1 justify-self-start"
              [disabled]="!draft().trim()"
            >
              <idv-icon name="check" [size]="18" />{{ t().mrz.check }}
            </button>
          </form>

          <p class="eyebrow mt-6">{{ t().mrz.examples }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (example of examples(); track example.label) {
              <button
                type="button"
                class="btn btn-ghost min-h-9 px-3 text-[0.8125rem]"
                (click)="use(example.text)"
              >
                {{ example.label }}
              </button>
            }
          </div>
        </div>

        <div class="min-w-0">
          @if (result(); as mrz) {
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="rounded-full bg-ink px-2.5 py-0.5 font-mono text-xs text-canvas">{{
                mrz.format
              }}</span>
              <span class="text-muted">{{ t().mrz.source[store.mrzSource() ?? "ocr"] }}</span>
              <span
                class="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                [class]="mrz.valid ? 'bg-pass-soft text-pass' : 'bg-fail-soft text-fail'"
              >
                <idv-icon [name]="mrz.valid ? 'check' : 'x'" [size]="13" [stroke]="2.5" />
                {{ validCount(mrz) }}/{{ mrz.checks.length }}
              </span>
            </div>

            <div
              id="mrz-zone"
              class="mt-3 overflow-x-auto rounded-xl border border-line bg-sunken p-4"
              role="group"
              [attr.aria-label]="t().mrz.title"
            >
              @for (line of highlighted(); track $index) {
                <p
                  class="m-0 font-mono text-[0.8rem] leading-7 tracking-[0.18em] whitespace-pre sm:text-[0.95rem]"
                >
                  @for (char of line; track $index) {
                    <span [class]="char.className">{{ char.char }}</span>
                  }
                </p>
              }
            </div>

            <div class="mt-5 grid gap-6 xl:grid-cols-2">
              <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                @for (field of fields; track field) {
                  <dt class="text-muted">{{ t().mrz.fields[field] }}</dt>
                  <dd class="m-0 font-mono break-words">{{ value(mrz, field) || "—" }}</dd>
                }
              </dl>
              <ul class="grid content-start gap-2">
                @for (c of mrz.checks; track c.field) {
                  <li
                    class="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    <span
                      class="grid size-6 shrink-0 place-items-center rounded-md"
                      [class]="c.valid ? 'bg-pass-soft text-pass' : 'bg-fail-soft text-fail'"
                    >
                      <idv-icon [name]="c.valid ? 'check' : 'x'" [size]="14" [stroke]="2.25" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block font-medium">{{ t().mrz.checkFields[c.field] }}</span>
                      <span class="block font-mono text-xs text-muted">
                        {{ fill(t().mrz.digit, { expected: c.expected, computed: c.computed }) }}
                      </span>
                    </span>
                    <span class="text-xs font-medium" [class]="c.valid ? 'text-pass' : 'text-fail'">
                      {{ c.valid ? t().mrz.valid : t().mrz.invalid }}
                    </span>
                  </li>
                }
              </ul>
            </div>
          } @else {
            <div
              class="grid h-full min-h-48 place-items-center rounded-xl border border-dashed border-line bg-sunken p-6 text-center"
            >
              <div
                class="font-mono text-[0.8rem] leading-7 tracking-[0.18em] text-muted select-none"
                aria-hidden="true"
              >
                <p class="m-0">I&lt;UTOD23145890&lt;&lt;&lt;&lt;&lt;&lt;</p>
                <p class="m-0">7408122F1204159UTO&lt;&lt;&lt;</p>
                <p class="m-0">ERIKSSON&lt;&lt;ANNA&lt;MARIA&lt;&lt;</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class MrzPanel {
  protected readonly store = inject(AnalysisStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fill = this.i18n.fill;
  protected readonly fields = FIELDS;
  protected readonly draft = signal("");
  protected readonly invalid = signal(false);

  protected readonly result = computed(() => {
    const mrz = this.store.mrz();
    return mrz && mrz !== "none" ? mrz : null;
  });

  protected readonly examples = computed(() => [
    { label: this.t().mrz.exampleTd1, text: SPECIMEN_MRZ.td1Utopia },
    { label: this.t().mrz.exampleTd3, text: SPECIMEN_MRZ.td3Utopia },
    { label: this.t().mrz.examplePl, text: SPECIMEN_MRZ.td1PolandSpecimen },
  ]);

  /** Every character of the zone; check digits coloured by their result, fillers dimmed. */
  protected readonly highlighted = computed(() => {
    const mrz = this.result();
    if (!mrz) return [];
    const marks = new Map<string, boolean>();
    for (const c of mrz.checks) {
      const position = DIGIT_POSITIONS[mrz.format][c.field];
      if (position) marks.set(position.join(":"), c.valid);
    }
    return mrz.lines.map((line, row) =>
      [...line].map((char, column) => {
        const mark = marks.get(`${row}:${column}`);
        const className =
          mark === undefined
            ? char === "<"
              ? "text-muted/60"
              : ""
            : mark
              ? "rounded-sm bg-pass-soft text-pass font-semibold underline decoration-2 underline-offset-4"
              : "rounded-sm bg-fail-soft text-fail font-semibold underline decoration-wavy decoration-2 underline-offset-4";
        return { char, className };
      }),
    );
  });

  protected validCount(mrz: MrzResult) {
    return mrz.checks.filter((c) => c.valid).length;
  }

  protected value(mrz: MrzResult, field: FieldKey): string {
    if (field === "birthDate" || field === "expiryDate") return mrz[field].iso ?? mrz[field].raw;
    return mrz[field];
  }

  protected use(text: string) {
    this.draft.set(text);
    this.invalid.set(false);
    this.store.checkManualMrz(text);
  }

  protected check(event: Event) {
    event.preventDefault();
    const ok = this.store.checkManualMrz(this.draft());
    this.invalid.set(!ok);
    if (!ok) document.getElementById("mrz-input")?.focus();
  }
}
