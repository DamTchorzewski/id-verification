// Machine-readable zone (MRZ) of travel documents, ICAO Doc 9303 parts 4-6.
// Parses TD1 (ID cards, 3 × 30), TD2 (2 × 36) and TD3 (passports, 2 × 44) and recomputes every
// check digit. It proves the zone is internally consistent, nothing more: a forger can compute
// check digits too.

export type MrzFormat = "TD1" | "TD2" | "TD3";

export type CheckField = "documentNumber" | "birthDate" | "expiryDate" | "optional" | "composite";

export interface CheckDigit {
  field: CheckField;
  /** the characters the digit covers */
  value: string;
  /** the digit printed in the zone ("<" counts as 0 where ICAO allows a filler) */
  expected: string;
  computed: number;
  valid: boolean;
}

export interface MrzDate {
  raw: string;
  /** ISO date (yyyy-mm-dd), or null when the digits are not a calendar date */
  iso: string | null;
}

export interface MrzResult {
  format: MrzFormat;
  lines: string[];
  documentCode: string;
  issuingState: string;
  documentNumber: string;
  nationality: string;
  birthDate: MrzDate;
  sex: "M" | "F" | "X";
  expiryDate: MrzDate;
  surname: string;
  givenNames: string;
  optionalData: string;
  checks: CheckDigit[];
  /** every check digit is valid */
  valid: boolean;
}

const WEIGHTS = [7, 3, 1] as const;

function charValue(char: string): number {
  if (char === "<") return 0;
  const code = char.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 90) return code - 55; // A=10 … Z=35
  throw new Error(`Not an MRZ character: ${char}`);
}

/** ICAO 9303 check digit: weights 7, 3, 1 repeated, sum modulo 10. */
export function checkDigit(value: string): number {
  let sum = 0;
  for (let i = 0; i < value.length; i++) sum += charValue(value[i]!) * WEIGHTS[i % 3]!;
  return sum % 10;
}

function check(field: CheckField, value: string, expected: string): CheckDigit {
  const computed = checkDigit(value);
  // A filler instead of the digit is allowed only for an empty optional field.
  const printed = expected === "<" ? 0 : Number(expected);
  const valid = /^[0-9<]$/.test(expected) && printed === computed;
  return { field, value, expected, computed, valid };
}

const strip = (value: string) => value.replace(/<+$/g, "").replace(/</g, " ").trim();

/**
 * MRZ dates are YYMMDD. A birth date is placed in the past century when it would otherwise lie in
 * the future; an expiry date is always 20YY.
 */
export function mrzDate(raw: string, kind: "birth" | "expiry", today: Date): MrzDate {
  if (!/^\d{6}$/.test(raw)) return { raw, iso: null };
  const yy = Number(raw.slice(0, 2));
  const mm = Number(raw.slice(2, 4));
  const dd = Number(raw.slice(4, 6));
  let year = 2000 + yy;
  if (kind === "birth" && year > today.getUTCFullYear()) year -= 100;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return { raw, iso: null };
  return { raw, iso: date.toISOString().slice(0, 10) };
}

function names(field: string) {
  const [surname = "", given = ""] = field.split("<<");
  return { surname: strip(surname), givenNames: strip(given.replace(/<+$/, "")) };
}

function sex(char: string): MrzResult["sex"] {
  return char === "M" || char === "F" ? char : "X";
}

/**
 * Cleans OCR output into candidate MRZ lines: upper case, common OCR confusions of the filler,
 * no spaces. Lines that cannot be MRZ (too short, no filler or digits) are dropped.
 */
export function normaliseMrzText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .toUpperCase()
        .replace(/[«‹＜〈]/g, "<")
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9<]/g, ""),
    )
    .filter((line) => line.length >= 28 && /[<0-9]/.test(line));
}

const LENGTHS: Record<MrzFormat, { lines: number; length: number }> = {
  TD1: { lines: 3, length: 30 },
  TD2: { lines: 2, length: 36 },
  TD3: { lines: 2, length: 44 },
};

/** Fits OCR'd lines to an exact width: pads with fillers, trims a trailing excess. */
function fit(line: string, length: number) {
  return line.length >= length ? line.slice(0, length) : line.padEnd(length, "<");
}

/** Finds a TD1, TD2 or TD3 zone in free text (OCR output or a pasted zone) and parses it. */
export function findMrz(text: string, today = new Date()): MrzResult | null {
  const lines = normaliseMrzText(text);
  const candidates: Array<{ format: MrzFormat; lines: string[] }> = [];
  for (const format of ["TD3", "TD2", "TD1"] as const) {
    const { lines: count, length } = LENGTHS[format];
    for (let start = 0; start + count <= lines.length; start++) {
      const group = lines.slice(start, start + count);
      // tolerate a few missing or extra characters from OCR
      if (group.every((line) => Math.abs(line.length - length) <= 3)) {
        candidates.push({ format, lines: group.map((line) => fit(line, length)) });
      }
    }
  }
  let best: MrzResult | null = null;
  for (const candidate of candidates) {
    const result = parseMrz(candidate.lines, candidate.format, today);
    if (!result) continue;
    const score = result.checks.filter((c) => c.valid).length;
    const bestScore = best ? best.checks.filter((c) => c.valid).length : -1;
    if (score > bestScore) best = result;
  }
  return best;
}

/** Parses lines of a known format; returns null when the structure is not MRZ at all. */
export function parseMrz(lines: string[], format: MrzFormat, today = new Date()): MrzResult | null {
  const { lines: count, length } = LENGTHS[format];
  if (
    lines.length !== count ||
    lines.some((line) => !new RegExp(`^[A-Z0-9<]{${length}}$`).test(line))
  )
    return null;
  const [l1 = "", l2 = "", l3 = ""] = lines;

  if (format === "TD1") {
    // ID cards: a document number longer than 9 characters continues in the optional field,
    // with "<" where its check digit would be (Doc 9303 part 5, note j).
    let documentNumber = l1.slice(5, 14);
    let numberCheck = check("documentNumber", documentNumber, l1[14]!);
    let optional = l1.slice(15, 30);
    if (l1[14] === "<" && /[0-9]/.test(optional)) {
      const overflow = optional.replace(/<.*$/, "");
      documentNumber = documentNumber + overflow.slice(0, -1);
      numberCheck = check("documentNumber", documentNumber, overflow.slice(-1));
      optional = optional.slice(overflow.length);
    }
    const checks = [
      numberCheck,
      check("birthDate", l2.slice(0, 6), l2[6]!),
      check("expiryDate", l2.slice(8, 14), l2[14]!),
      check(
        "composite",
        l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
        l2[29]!,
      ),
    ];
    return {
      format,
      lines,
      documentCode: strip(l1.slice(0, 2)),
      issuingState: strip(l1.slice(2, 5)),
      documentNumber: strip(documentNumber),
      nationality: strip(l2.slice(15, 18)),
      birthDate: mrzDate(l2.slice(0, 6), "birth", today),
      sex: sex(l2[7]!),
      expiryDate: mrzDate(l2.slice(8, 14), "expiry", today),
      ...names(l3),
      optionalData: strip(optional + l2.slice(18, 29)),
      checks,
      valid: checks.every((c) => c.valid),
    };
  }

  if (format === "TD2") {
    const checks = [
      check("documentNumber", l2.slice(0, 9), l2[9]!),
      check("birthDate", l2.slice(13, 19), l2[19]!),
      check("expiryDate", l2.slice(21, 27), l2[27]!),
      check("composite", l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35), l2[35]!),
    ];
    return {
      format,
      lines,
      documentCode: strip(l1.slice(0, 2)),
      issuingState: strip(l1.slice(2, 5)),
      documentNumber: strip(l2.slice(0, 9)),
      nationality: strip(l2.slice(10, 13)),
      birthDate: mrzDate(l2.slice(13, 19), "birth", today),
      sex: sex(l2[20]!),
      expiryDate: mrzDate(l2.slice(21, 27), "expiry", today),
      ...names(l1.slice(5, 36)),
      optionalData: strip(l2.slice(28, 35)),
      checks,
      valid: checks.every((c) => c.valid),
    };
  }

  const checks = [
    check("documentNumber", l2.slice(0, 9), l2[9]!),
    check("birthDate", l2.slice(13, 19), l2[19]!),
    check("expiryDate", l2.slice(21, 27), l2[27]!),
    check("optional", l2.slice(28, 42), l2[42]!),
    check("composite", l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43), l2[43]!),
  ];
  return {
    format,
    lines,
    documentCode: strip(l1.slice(0, 2)),
    issuingState: strip(l1.slice(2, 5)),
    documentNumber: strip(l2.slice(0, 9)),
    nationality: strip(l2.slice(10, 13)),
    birthDate: mrzDate(l2.slice(13, 19), "birth", today),
    sex: sex(l2[20]!),
    expiryDate: mrzDate(l2.slice(21, 27), "expiry", today),
    ...names(l1.slice(5, 44)),
    optionalData: strip(l2.slice(28, 42)),
    checks,
    valid: checks.every((c) => c.valid),
  };
}

/**
 * Specimen zones for the demo. The two Utopia (UTO) zones are the worked examples of ICAO Doc 9303;
 * the Polish one is generated here from the data printed on the WZORZEC specimen card, with check
 * digits computed by this module. None of them belongs to a real person.
 */
export const SPECIMEN_MRZ = {
  td1Utopia: [
    "I<UTOD231458907<<<<<<<<<<<<<<<",
    "7408122F1204159UTO<<<<<<<<<<<6",
    "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
  ].join("\n"),
  td3Utopia: [
    "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
    "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
  ].join("\n"),
  td1PolandSpecimen: buildTd1({
    documentCode: "ID",
    state: "POL",
    documentNumber: "ZZC508977",
    birth: "810102",
    sex: "M",
    expiry: "311005",
    surname: "KOWALSKI",
    givenNames: "JAN",
  }),
} as const;

/** Builds a TD1 zone with correct check digits (used for the generated specimen). */
export function buildTd1(data: {
  documentCode: string;
  state: string;
  documentNumber: string;
  birth: string;
  sex: "M" | "F" | "<";
  expiry: string;
  surname: string;
  givenNames: string;
}): string {
  const pad = (value: string, length: number) => value.padEnd(length, "<").slice(0, length);
  const l1 =
    pad(data.documentCode, 2) +
    data.state +
    data.documentNumber +
    checkDigit(data.documentNumber) +
    pad("", 15);
  const l2Body =
    data.birth +
    checkDigit(data.birth) +
    data.sex +
    data.expiry +
    checkDigit(data.expiry) +
    data.state +
    pad("", 11);
  const composite = checkDigit(
    l1.slice(5, 30) + l2Body.slice(0, 7) + l2Body.slice(8, 15) + l2Body.slice(18, 29),
  );
  const l3 = pad(`${data.surname}<<${data.givenNames.replace(/ /g, "<")}`, 30);
  return [l1, l2Body + composite, l3].join("\n");
}
