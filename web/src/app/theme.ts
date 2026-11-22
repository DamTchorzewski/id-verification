import { effect, Injectable, signal } from "@angular/core";

export type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "idv.theme";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // storage blocked: follow the system
  }
  return "system";
}

/** Light, dark or the system's choice; the CSS reads `data-theme` on <html>. */
@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly theme = signal<Theme>(initialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (theme === "system") delete document.documentElement.dataset["theme"];
      else document.documentElement.dataset["theme"] = theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // the choice just is not remembered
      }
    });
  }
}
