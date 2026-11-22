import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

// Icons drawn after Lucide (ISC licence), as path data so the template needs no innerHTML.
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const ICONS = {
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  camera: [
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
    circle(12, 13, 3),
  ],
  card: [rect(2, 5, 20, 14, 2), circle(8, 11, 2), "M5.5 16a3 3 0 0 1 5 0", "M14 10h4", "M14 14h4"],
  check: ["M20 6 9 17l-5-5"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  alert: [
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
    "M12 9v4",
    "M12 17h.01",
  ],
  info: [circle(12, 12, 10), "M12 16v-4", "M12 8h.01"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  copy: [rect(8, 8, 14, 14, 2), "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"],
  reset: ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5"],
  sun: [
    circle(12, 12, 4),
    "M12 2v2",
    "M12 20v2",
    "m4.93 4.93 1.41 1.41",
    "m17.66 17.66 1.41 1.41",
    "M2 12h2",
    "M20 12h2",
    "m6.34 17.66-1.41 1.41",
    "m19.07 4.93-1.41 1.41",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  monitor: [rect(2, 3, 20, 14, 2), "M8 21h8", "M12 17v4"],
  lock: [rect(3, 11, 18, 11, 2), "M7 11V7a5 5 0 0 1 10 0v4"],
  cpu: [
    rect(4, 4, 16, 16, 2),
    rect(9, 9, 6, 6, 1),
    "M15 2v2",
    "M15 20v2",
    "M2 15h2",
    "M2 9h2",
    "M20 15h2",
    "M20 9h2",
    "M9 2v2",
    "M9 20v2",
  ],
  scan: [
    "M3 7V5a2 2 0 0 1 2-2h2",
    "M17 3h2a2 2 0 0 1 2 2v2",
    "M21 17v2a2 2 0 0 1-2 2h-2",
    "M7 21H5a2 2 0 0 1-2-2v-2",
    "M7 12h10",
  ],
  loader: ["M21 12a9 9 0 1 1-6.219-8.56"],
  external: [
    "M15 3h6v6",
    "M10 14 21 3",
    "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  ],
  image: [rect(3, 3, 18, 18, 2), circle(9, 9, 2), "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"],
  dot: [circle(12, 12, 3)],
  minus: ["M5 12h14"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", circle(12, 12, 3)],
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: "idv-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex shrink-0", "aria-hidden": "true" },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="stroke()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly stroke = input(1.75);
  protected readonly paths = computed(() => ICONS[this.name()]);
}
