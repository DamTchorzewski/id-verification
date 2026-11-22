import { describe, expect, it } from "vitest";
import { COUNTRIES, matchCountry, normaliseText } from "./country";

const poland = COUNTRIES.find((c) => c.code === "POL")!;
const germany = COUNTRIES.find((c) => c.code === "DEU")!;

describe("normaliseText", () => {
  it("drops diacritics, case and punctuation", () => {
    expect(normaliseText("Dowód  osobisty, Łódź!")).toBe(" DOWOD OSOBISTY LODZ ");
  });
});

describe("matchCountry", () => {
  const ocr = "Rzeczpospolita Polska Republic of Poland\nDowód osobisty Identity card\nPOLSKIE";

  it("finds the country in the text of the Polish specimen", () => {
    const result = matchCountry(poland, ocr);
    expect(result.matched).toBe(true);
    expect(result.evidence).toContain("RZECZPOSPOLITA POLSKA");
    expect(result.evidence).toContain("POLSKIE");
  });

  it("does not match a different declared country (like verifyID.py: Invalid ID)", () => {
    expect(matchCountry(germany, ocr)).toEqual({ matched: false, evidence: [] });
  });

  it("does not match a word inside another word", () => {
    expect(matchCountry(poland, "POLSKAJA").matched).toBe(false);
  });

  it("uses the MRZ codes as evidence", () => {
    const result = matchCountry(poland, "", { issuingState: "POL", nationality: "POL" });
    expect(result.evidence).toEqual(["MRZ POL"]);
  });
});
