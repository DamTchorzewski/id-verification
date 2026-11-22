import js from "@eslint/js";
import angular from "angular-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "dist",
    ".scratch",
    "node_modules",
    "playwright-report",
    "test-results",
    "openCv",
  ]),
  {
    files: ["**/*.{js,mjs,ts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["web/src/**/*.ts"],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "idv", style: "kebab-case" },
      ],
    },
  },
  {
    // the inline templates, with the accessibility rules
    files: ["**/*.html"],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
);
