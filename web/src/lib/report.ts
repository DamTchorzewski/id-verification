// Turns what the pipeline found into the result card: one line per technical check, plus the list
// of things this demo never checks. The wording lives in i18n.ts; this module only decides statuses.
import type { CountryMatch } from "./country";
import { normaliseText } from "./country";
import type { MrzResult } from "./mrz";

export type CheckStatus = "pass" | "fail" | "warn" | "info";

export type CheckId =
  | "image"
  | "outline"
  | "ocr"
  | "country"
  | "mrzFound"
  | "mrzDigits"
  | "mrzExpiry"
  | "mrzMatchesText"
  | "face";

export interface ReportItem {
  id: CheckId;
  status: CheckStatus;
  params: Record<string, string | number>;
}

export const NOT_CHECKED = [
  "securityFeatures",
  "chip",
  "liveness",
  "faceMatch",
  "registers",
  "tampering",
] as const;
export type NotCheckedId = (typeof NOT_CHECKED)[number];

export interface AnalysisFacts {
  image: { width: number; height: number } | null;
  outlineFound: boolean | null;
  ocr: { text: string; confidence: number } | null;
  country: { name: string; match: CountryMatch } | null;
  /** null: not looked for yet; "none": looked for and not found */
  mrz: MrzResult | "none" | null;
  faces: number | null;
  today: Date;
}

/** OCR mean word confidence (0-100) below which the text is flagged as unreliable. */
export const OCR_CONFIDENCE_OK = 60;

export function buildReport(facts: AnalysisFacts): ReportItem[] {
  const items: ReportItem[] = [];
  const add = (id: CheckId, status: CheckStatus, params: ReportItem["params"] = {}) =>
    items.push({ id, status, params });

  if (facts.image) add("image", "pass", { width: facts.image.width, height: facts.image.height });

  if (facts.outlineFound !== null) add("outline", facts.outlineFound ? "pass" : "warn");

  if (facts.ocr) {
    const chars = facts.ocr.text.replace(/\s/g, "").length;
    const confidence = Math.round(facts.ocr.confidence);
    add("ocr", chars === 0 ? "fail" : confidence >= OCR_CONFIDENCE_OK ? "pass" : "warn", {
      chars,
      confidence,
    });
  }

  if (facts.country) {
    add("country", facts.country.match.matched ? "pass" : "fail", {
      country: facts.country.name,
      evidence: facts.country.match.evidence.join(", "),
    });
  }

  if (facts.mrz === "none") add("mrzFound", "info");
  else if (facts.mrz) {
    const mrz = facts.mrz;
    add("mrzFound", "pass", { format: mrz.format });
    const valid = mrz.checks.filter((c) => c.valid).length;
    add("mrzDigits", mrz.valid ? "pass" : "fail", { valid, total: mrz.checks.length });
    if (mrz.expiryDate.iso) {
      const expired = mrz.expiryDate.iso < facts.today.toISOString().slice(0, 10);
      add("mrzExpiry", expired ? "fail" : "pass", { date: mrz.expiryDate.iso });
    } else add("mrzExpiry", "fail", { date: mrz.expiryDate.raw });
    if (facts.ocr && facts.ocr.text.trim()) {
      const text = normaliseText(facts.ocr.text).replace(/ /g, "");
      const found = [mrz.documentNumber, mrz.surname].filter(
        (value) => value && text.includes(normaliseText(value).replace(/ /g, "")),
      ).length;
      add("mrzMatchesText", found === 2 ? "pass" : found === 1 ? "warn" : "fail", { found });
    }
  }

  if (facts.faces !== null) add("face", facts.faces > 0 ? "pass" : "fail", { count: facts.faces });

  return items;
}

export function summarise(items: ReportItem[]) {
  const count = (status: CheckStatus) => items.filter((item) => item.status === status).length;
  return { pass: count("pass"), fail: count("fail"), warn: count("warn"), total: items.length };
}
