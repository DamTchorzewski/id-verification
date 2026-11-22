import { describe, expect, it } from "vitest";
import { COUNTRIES, matchCountry } from "./country";
import { findMrz, SPECIMEN_MRZ } from "./mrz";
import { buildReport, summarise, type AnalysisFacts } from "./report";

const today = new Date(Date.UTC(2026, 10, 22));
const poland = COUNTRIES.find((c) => c.code === "POL")!;
const ocrText = "RZECZPOSPOLITA POLSKA\nKOWALSKI\nJAN\nPOLSKIE\nZZC508977";

const base: AnalysisFacts = {
  image: { width: 1600, height: 1008 },
  outlineFound: true,
  ocr: { text: ocrText, confidence: 78.4 },
  country: { name: "Polska", match: matchCountry(poland, ocrText) },
  mrz: null,
  faces: 2,
  today,
};

const status = (facts: AnalysisFacts) =>
  Object.fromEntries(buildReport(facts).map((item) => [item.id, item.status]));

describe("buildReport", () => {
  it("lists only the steps that ran", () => {
    expect(
      buildReport({ ...base, outlineFound: null, ocr: null, country: null, faces: null }),
    ).toEqual([{ id: "image", status: "pass", params: { width: 1600, height: 1008 } }]);
  });

  it("passes the specimen front, with the MRZ reported as not found", () => {
    expect(status({ ...base, mrz: "none" })).toEqual({
      image: "pass",
      outline: "pass",
      ocr: "pass",
      country: "pass",
      mrzFound: "info",
      face: "pass",
    });
  });

  it("checks the MRZ digits, the expiry and the match with the printed text", () => {
    const report = status({ ...base, mrz: findMrz(SPECIMEN_MRZ.td1PolandSpecimen, today) });
    expect(report).toMatchObject({
      mrzFound: "pass",
      mrzDigits: "pass",
      mrzExpiry: "pass",
      mrzMatchesText: "pass",
    });
  });

  it("fails an expired document and a zone from another document", () => {
    const report = status({ ...base, mrz: findMrz(SPECIMEN_MRZ.td1Utopia, today) });
    expect(report).toMatchObject({ mrzDigits: "pass", mrzExpiry: "fail", mrzMatchesText: "fail" });
  });

  it("warns on a low OCR confidence and fails on no text or no face", () => {
    expect(status({ ...base, ocr: { text: "x", confidence: 31 } }).ocr).toBe("warn");
    expect(status({ ...base, ocr: { text: " ", confidence: 0 } }).ocr).toBe("fail");
    expect(status({ ...base, faces: 0 }).face).toBe("fail");
    expect(status({ ...base, outlineFound: false }).outline).toBe("warn");
  });
});

describe("summarise", () => {
  it("counts the statuses", () => {
    const items = buildReport({ ...base, faces: 0 });
    expect(summarise(items)).toEqual({ pass: 4, fail: 1, warn: 0, total: 5 });
  });
});
