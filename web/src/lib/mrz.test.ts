import { describe, expect, it } from "vitest";
import { checkDigit, findMrz, mrzDate, normaliseMrzText, parseMrz, SPECIMEN_MRZ } from "./mrz";

const TODAY = new Date(Date.UTC(2026, 10, 22));

describe("checkDigit", () => {
  it("matches the worked examples of ICAO Doc 9303", () => {
    expect(checkDigit("D23145890")).toBe(7);
    expect(checkDigit("L898902C3")).toBe(6);
    expect(checkDigit("740812")).toBe(2);
    expect(checkDigit("120415")).toBe(9);
    expect(checkDigit("ZE184226B<<<<<")).toBe(1);
  });

  it("counts the filler as zero and letters from 10", () => {
    expect(checkDigit("<<<")).toBe(0);
    expect(checkDigit("A")).toBe(0); // 10 × 7 = 70
    expect(checkDigit("Z")).toBe(5); // 35 × 7 = 245
  });

  it("rejects characters outside the MRZ alphabet", () => {
    expect(() => checkDigit("a")).toThrow();
  });
});

describe("mrzDate", () => {
  it("puts a birth date in the past century when 20YY would be in the future", () => {
    expect(mrzDate("740812", "birth", TODAY).iso).toBe("1974-08-12");
    expect(mrzDate("050101", "birth", TODAY).iso).toBe("2005-01-01");
  });

  it("keeps expiry dates in 20YY and rejects impossible dates", () => {
    expect(mrzDate("311005", "expiry", TODAY).iso).toBe("2031-10-05");
    expect(mrzDate("120231", "expiry", TODAY).iso).toBeNull();
    expect(mrzDate("12AB31", "expiry", TODAY).iso).toBeNull();
  });
});

describe("parseMrz", () => {
  it("reads the ICAO TD1 specimen with every check digit valid", () => {
    const result = findMrz(SPECIMEN_MRZ.td1Utopia, TODAY)!;
    expect(result.format).toBe("TD1");
    expect(result).toMatchObject({
      documentCode: "I",
      issuingState: "UTO",
      documentNumber: "D23145890",
      nationality: "UTO",
      sex: "F",
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
    });
    expect(result.birthDate.iso).toBe("1974-08-12");
    expect(result.expiryDate.iso).toBe("2012-04-15");
    expect(result.checks.map((c) => [c.field, c.valid])).toEqual([
      ["documentNumber", true],
      ["birthDate", true],
      ["expiryDate", true],
      ["composite", true],
    ]);
    expect(result.valid).toBe(true);
  });

  it("reads the ICAO TD3 specimen including the optional and composite digits", () => {
    const result = findMrz(SPECIMEN_MRZ.td3Utopia, TODAY)!;
    expect(result.format).toBe("TD3");
    expect(result.documentNumber).toBe("L898902C3");
    expect(result.optionalData).toBe("ZE184226B");
    expect(result.checks).toHaveLength(5);
    expect(result.valid).toBe(true);
  });

  it("builds a consistent zone for the Polish specimen card", () => {
    const result = findMrz(SPECIMEN_MRZ.td1PolandSpecimen, TODAY)!;
    expect(result).toMatchObject({
      format: "TD1",
      documentCode: "ID",
      issuingState: "POL",
      documentNumber: "ZZC508977",
      surname: "KOWALSKI",
      givenNames: "JAN",
      sex: "M",
      valid: true,
    });
    expect(result.birthDate.iso).toBe("1981-01-02");
    expect(result.expiryDate.iso).toBe("2031-10-05");
  });

  it("parses a TD2 zone", () => {
    const lines = ["I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<", "D231458907UTO7408122F1204159<<<<<<<6"];
    const result = parseMrz(lines, "TD2", TODAY)!;
    expect(result.documentNumber).toBe("D23145890");
    expect(result.surname).toBe("ERIKSSON");
    expect(result.valid).toBe(true);
  });

  it("flags the field whose digit does not match", () => {
    const tampered = SPECIMEN_MRZ.td3Utopia.replace("7408122", "7408132");
    const result = findMrz(tampered, TODAY)!;
    expect(result.valid).toBe(false);
    const failed = result.checks.filter((c) => !c.valid).map((c) => c.field);
    expect(failed).toEqual(["birthDate", "composite"]);
  });

  it("reads a TD1 document number that overflows into the optional field", () => {
    const lines = [
      "I<UTOD23145890<AB112234566<<<<",
      "7408122F1204159UTO<<<<<<<<<<<4",
      "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
    ];
    const result = parseMrz(lines, "TD1", TODAY)!;
    expect(result.documentNumber).toBe("D23145890<AB11223456".replace("<", ""));
    expect(result.checks[0]!.expected).toBe("6");
  });

  it("returns null for text that is not a zone", () => {
    expect(parseMrz(["HELLO"], "TD1", TODAY)).toBeNull();
    expect(findMrz("Rzeczpospolita Polska\nDowód osobisty", TODAY)).toBeNull();
  });
});

describe("normaliseMrzText", () => {
  it("cleans typical OCR noise around a zone", () => {
    const ocr = "  i<uto d23145890 7<<<<<<<<<<<<<<< \nnoise\n7408122F1204159UTO«<<<<<<<<<<6";
    expect(normaliseMrzText(ocr)).toEqual([
      "I<UTOD231458907<<<<<<<<<<<<<<<",
      "7408122F1204159UTO<<<<<<<<<<<6",
    ]);
  });

  it("finds a zone with a character lost by OCR", () => {
    const ocr = SPECIMEN_MRZ.td1Utopia.replace(
      "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
      "ERIKSSON<<ANNA<MARIA<<<<<<<<<",
    );
    expect(findMrz(ocr, TODAY)?.valid).toBe(true);
  });
});
