// The declared-country check from openCv/verifyID.py, made a little less naive: it looks for the
// country's names (native, Polish, English), the nationality word printed on cards and the ICAO
// code, in the OCR text and in the MRZ.

export interface Country {
  /** ICAO 9303 three-letter code (ISO 3166-1 alpha-3, plus UTO for the ICAO specimens) */
  code: string;
  name: { pl: string; en: string };
  /** words that, found in the document text, point at this country */
  words: string[];
}

export const COUNTRIES: Country[] = [
  {
    code: "POL",
    name: { pl: "Polska", en: "Poland" },
    words: ["POLSKA", "POLAND", "RZECZPOSPOLITA POLSKA", "REPUBLIC OF POLAND", "POLSKIE", "POLISH"],
  },
  {
    code: "DEU",
    name: { pl: "Niemcy", en: "Germany" },
    words: ["DEUTSCHLAND", "GERMANY", "BUNDESREPUBLIK", "DEUTSCH"],
  },
  {
    code: "UKR",
    name: { pl: "Ukraina", en: "Ukraine" },
    words: ["UKRAINA", "UKRAINE", "УКРАЇНА", "UKRAINIAN"],
  },
  {
    code: "CZE",
    name: { pl: "Czechy", en: "Czechia" },
    words: ["CESKA REPUBLIKA", "CZECH REPUBLIC", "CZECHIA", "CESKA"],
  },
  { code: "LTU", name: { pl: "Litwa", en: "Lithuania" }, words: ["LIETUVA", "LITHUANIA"] },
  {
    code: "SVK",
    name: { pl: "Słowacja", en: "Slovakia" },
    words: ["SLOVENSKA REPUBLIKA", "SLOVAK REPUBLIC", "SLOVAKIA"],
  },
  {
    code: "GBR",
    name: { pl: "Wielka Brytania", en: "United Kingdom" },
    words: ["UNITED KINGDOM", "GREAT BRITAIN", "BRITISH"],
  },
  { code: "FRA", name: { pl: "Francja", en: "France" }, words: ["REPUBLIQUE FRANCAISE", "FRANCE"] },
  {
    code: "ESP",
    name: { pl: "Hiszpania", en: "Spain" },
    words: ["ESPANA", "SPAIN", "REINO DE ESPANA"],
  },
  {
    code: "ITA",
    name: { pl: "Włochy", en: "Italy" },
    words: ["REPUBBLICA ITALIANA", "ITALIA", "ITALY"],
  },
  {
    code: "UTO",
    name: { pl: "Utopia (wzór ICAO)", en: "Utopia (ICAO specimen)" },
    words: ["UTOPIA"],
  },
];

export interface CountryMatch {
  matched: boolean;
  /** what was found, e.g. `POLSKA`, `MRZ POL` */
  evidence: string[];
}

/** Upper case without diacritics, punctuation as spaces, so "Rzeczpospolita  Polska," matches. */
export function normaliseText(text: string): string {
  return ` ${text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}

export function matchCountry(
  country: Country,
  ocrText: string,
  mrz?: { issuingState: string; nationality: string } | null,
): CountryMatch {
  const haystack = normaliseText(ocrText);
  const evidence = country.words.filter((word) => haystack.includes(normaliseText(word)));
  if (mrz?.issuingState === country.code || mrz?.nationality === country.code)
    evidence.push(`MRZ ${country.code}`);
  return { matched: evidence.length > 0, evidence };
}
