// Every text of the interface, in Polish and English. The English object is typed against the
// Polish one, so a missing translation fails the typecheck.
import { computed, effect, Injectable, signal } from "@angular/core";
import type { CheckId, CheckStatus, NotCheckedId } from "../lib/report";
import type { CheckField } from "../lib/mrz";

export type Lang = "pl" | "en";

const pl = {
  skip: "Przejdź do treści",
  brandTag: "prototyp",
  nav: {
    language: "Język",
    theme: "Motyw",
    themes: { system: "Systemowy", light: "Jasny", dark: "Ciemny" },
  },
  hero: {
    eyebrow: "Analiza dokumentu w przeglądarce",
    title: "Zobacz, co komputer potrafi odczytać z dowodu, zanim cokolwiek wyślesz.",
    lead: "OpenCV, Tesseract i MediaPipe działają tu jako WebAssembly na Twoim urządzeniu. Zdjęcie nie opuszcza przeglądarki: nie ma serwera, analityki ani ciasteczek.",
    privacy: [
      "0 bajtów wysłanych: wszystko liczy Twój procesor",
      "Biblioteki ładowane dopiero przy pierwszym użyciu",
      "Wynik jest techniczny, nie potwierdza autentyczności",
    ],
  },
  input: {
    title: "Wybierz obraz dokumentu",
    drop: "Upuść zdjęcie tutaj",
    dropHint: "JPG, PNG lub WebP. Obraz zostaje w pamięci tej karty.",
    choose: "Wybierz plik",
    camera: "Zrób zdjęcie",
    sample: "Albo użyj wzoru",
    samples: { scan: "Wzór: skan", photo: "Wzór: zdjęcie pod kątem" },
    sampleNote:
      "Wzór polskiego dowodu osobistego opublikowany przez MSWiA, z napisem WZORZEC; nie są to dane prawdziwej osoby. Zdjęcie pod kątem powstało z tego samego wzoru.",
    wrongType: "To nie jest obraz. Wybierz plik JPG, PNG lub WebP.",
    readError: "Nie udało się odczytać obrazu.",
    reset: "Wyczyść wszystko",
    resetDone: "Wyczyszczono. Obraz i wyniki usunięto z pamięci karty.",
  },
  camera: {
    title: "Zdjęcie aparatem",
    hint: "Połóż dokument na ciemnym tle, cały w kadrze, bez odbić światła.",
    capture: "Zrób zdjęcie",
    cancel: "Anuluj",
    denied: "Brak dostępu do aparatu. Zezwól na niego w przeglądarce albo wybierz plik.",
    unsupported: "Ta przeglądarka nie udostępnia aparatu stronie. Wybierz plik.",
    starting: "Uruchamianie aparatu…",
    preview: "Podgląd z aparatu",
  },
  pipeline: {
    title: "Przetwarzanie krok po kroku",
    lead: "Kliknij krok, żeby zobaczyć obraz pośredni. Te same operacje wykonuje skrypt openCv/verifyID.py.",
    run: "Analizuj ponownie",
    running: "Analiza w toku",
    loading: "Pobieranie {name}…",
    steps: {
      original: {
        title: "Oryginał",
        text: "Obraz zmniejszony do najwyżej 1600 px dłuższego boku.",
      },
      grayscale: {
        title: "Skala szarości",
        text: "cvtColor RGBA → GRAY. Kolor nie jest potrzebny do krawędzi ani progu.",
      },
      threshold: {
        title: "Progowanie",
        text: "Obraz binarny i otwarcie morfologiczne 3 × 3 usuwające szum, jak w verifyID.py.",
      },
      edges: {
        title: "Krawędzie",
        text: "Rozmycie Gaussa 5 × 5 i detektor Canny (progi 75 i 200).",
      },
      outline: {
        title: "Kontur dokumentu",
        text: "Największy wypukły czworokąt zajmujący co najmniej 20% kadru.",
      },
      warped: {
        title: "Wyprostowanie",
        text: "Transformacja perspektywiczna do proporcji karty ID-1 (85,6 × 54 mm).",
      },
      ocr: {
        title: "OCR",
        text: "Tesseract (LSTM, polski + angielski) w trybie rzadkiego tekstu (PSM 11), na wyprostowanym obrazie w skali szarości.",
      },
      faces: {
        title: "Twarze",
        text: "MediaPipe BlazeFace (short range) na wyprostowanym dokumencie.",
      },
    },
    status: {
      idle: "czeka",
      running: "w toku",
      done: "gotowe",
      error: "błąd",
      skipped: "pominięte",
    },
    thresholdMode: "Próg",
    otsu: "Automatyczny (Otsu)",
    manual: "Ręczny",
    thresholdValue: "Wartość progu",
    thresholdUsed: "Użyty próg: {value}",
    noOutline:
      "Nie znaleziono krawędzi dokumentu: zdjęcie jest przycięte do karty albo tło ma podobny kolor. OCR działa na całym kadrze.",
    outlineFound: "Znaleziono kontur dokumentu.",
    ms: "{value} ms",
    viewerAlt: "{step}: obraz pośredni analizy",
    showBoxes: "Pokaż ramki słów",
  },
  ocr: {
    title: "Odczytany tekst",
    confidence: "Średnia pewność: {value}%",
    words: "{value} słów",
    empty: "Brak tekstu. Spróbuj ostrzejszego zdjęcia albo innego progu.",
    source: "Obraz dla OCR",
    sources: {
      warpedGray: "Wyprostowany, skala szarości",
      warped: "Wyprostowany, kolor",
      threshold: "Po progowaniu (cały kadr)",
    },
    copy: "Kopiuj tekst",
    copied: "Skopiowano tekst do schowka.",
  },
  mrz: {
    title: "Strefa MRZ i cyfry kontrolne",
    lead: "Strefa odczytu maszynowego (ICAO 9303) jest na odwrocie dowodu i na stronie danych paszportu. Cyfra kontrolna to suma ważona 7-3-1 modulo 10.",
    notFound:
      "Na tym obrazie nie znaleziono MRZ. Wzór WZORZEC to przód dowodu; strefa jest na odwrocie. Możesz wkleić MRZ poniżej.",
    paste: "MRZ do sprawdzenia (2 albo 3 linie)",
    pasteHint: "Wielkie litery, cyfry i znak <. Linie oddzielone Enterem.",
    check: "Sprawdź MRZ",
    examples: "Przykłady",
    exampleTd1: "Dowód TD1 (Utopia, ICAO)",
    exampleTd3: "Paszport TD3 (Utopia, ICAO)",
    examplePl: "TD1 zgodny z wzorem PL (wygenerowany)",
    invalidInput: "To nie wygląda na MRZ w formacie TD1, TD2 ani TD3.",
    source: { ocr: "odczytana z obrazu", manual: "wklejona ręcznie" },
    format: "Format",
    fields: {
      documentCode: "Typ dokumentu",
      issuingState: "Państwo wydania",
      documentNumber: "Numer dokumentu",
      nationality: "Obywatelstwo",
      birthDate: "Data urodzenia",
      sex: "Płeć",
      expiryDate: "Data ważności",
      surname: "Nazwisko",
      givenNames: "Imiona",
      optionalData: "Dane dodatkowe",
    },
    checkFields: {
      documentNumber: "Numer dokumentu",
      birthDate: "Data urodzenia",
      expiryDate: "Data ważności",
      optional: "Dane dodatkowe",
      composite: "Cyfra łączna",
    } satisfies Record<CheckField, string>,
    digit: "wydrukowana {expected}, wyliczona {computed}",
    valid: "zgodna",
    invalid: "niezgodna",
  },
  faces: {
    title: "Wykryte twarze",
    count: "Twarze: {value}",
    none: "Nie wykryto twarzy.",
    score: "pewność {value}%",
    crop: "Wycinek twarzy {n}, pewność {score}%",
    note: "Dowód ma zwykle dwie twarze: zdjęcie główne i mniejsze zdjęcie-duch. Wykrycie twarzy nie jest porównaniem z osobą.",
  },
  country: {
    title: "Deklarowany kraj",
    label: "Kraj podany przez użytkownika",
    hint: "Jak w verifyID.py: czy kraj pojawia się w tekście dokumentu albo w MRZ.",
  },
  result: {
    title: "Wynik",
    badge: "Wynik techniczny",
    summary: "{pass} z {total} sprawdzeń zaliczonych",
    disclaimer:
      "To prototyp przetwarzania obrazu. Nie potwierdza, że dokument jest prawdziwy ani że należy do osoby, która go pokazuje.",
    checked: "Sprawdzone",
    notChecked: "Nie sprawdzane w tej wersji",
    waiting: "Wybierz obraz, a wynik pojawi się tutaj.",
    export: "Pobierz raport JSON",
    exportNote: "Raport zawiera wyniki i tekst, bez obrazów.",
    statuses: {
      pass: "zaliczone",
      fail: "niezaliczone",
      warn: "uwaga",
      info: "informacja",
    } satisfies Record<CheckStatus, string>,
    checks: {
      image: { title: "Obraz wczytany", detail: "{width} × {height} px po zmniejszeniu" },
      outline: {
        title: "Kontur dokumentu",
        pass: "znaleziony i wyprostowany",
        warn: "nie znaleziony, użyto całego kadru",
      },
      ocr: {
        title: "Tekst odczytany (OCR)",
        detail: "{chars} znaków, średnia pewność {confidence}%",
      },
      country: {
        title: "Kraj w dokumencie: {country}",
        pass: "znaleziono: {evidence}",
        fail: "nie znaleziono w tekście ani w MRZ",
      },
      mrzFound: {
        title: "Strefa MRZ",
        pass: "znaleziona ({format})",
        info: "nie znaleziona na tym obrazie",
      },
      mrzDigits: { title: "Cyfry kontrolne MRZ", detail: "{valid} z {total} zgodnych" },
      mrzExpiry: {
        title: "Data ważności z MRZ",
        pass: "{date}, dokument ważny",
        fail: "{date}, termin minął albo data błędna",
      },
      mrzMatchesText: {
        title: "MRZ zgodna z tekstem z przodu",
        pass: "numer i nazwisko znalezione w tekście",
        warn: "znaleziono 1 z 2 (numer, nazwisko)",
        fail: "numeru ani nazwiska nie ma w tekście",
      },
      face: { title: "Twarz na dokumencie", detail: "wykryto: {count}" },
    } satisfies Record<
      CheckId,
      { title: string; detail?: string } & Partial<Record<CheckStatus, string>>
    >,
    notCheckedItems: {
      securityFeatures: "Zabezpieczenia fizyczne: hologram, farba OVI, mikrodruk, UV",
      chip: "Chip e-dowodu (NFC) i jego podpis cyfrowy",
      liveness: "Czy przed aparatem jest żywa osoba (liveness)",
      faceMatch: "Porównanie twarzy z dokumentu z twarzą osoby (selfie)",
      registers: "Rejestry dokumentów utraconych i unieważnionych",
      tampering: "Ślady edycji zdjęcia lub podmiany danych",
    } satisfies Record<NotCheckedId, string>,
  },
  footer: {
    status:
      "Prototyp edukacyjny. Nie używaj go do decyzji o tożsamości. Kod i skrypty Pythona: repozytorium id-verification na GitHubie.",
    source: "Kod źródłowy (nowa karta)",
    libraries: "OpenCV.js, Tesseract.js, MediaPipe Tasks: Apache-2.0. Wzór dowodu: MSWiA.",
  },
  progress: {
    opencv: "OpenCV.js (do 11 MB)",
    tesseract: "Tesseract i dane języków (do 10 MB)",
    mediapipe: "MediaPipe (do 14 MB)",
    done: "Analiza zakończona: {summary}.",
    failed: "Krok {step} nie powiódł się: {message}",
  },
};

export type Messages = typeof pl;

const en: Messages = {
  skip: "Skip to content",
  brandTag: "prototype",
  nav: {
    language: "Language",
    theme: "Theme",
    themes: { system: "System", light: "Light", dark: "Dark" },
  },
  hero: {
    eyebrow: "Document analysis in the browser",
    title: "See what a computer can read from an ID before you send it anywhere.",
    lead: "OpenCV, Tesseract and MediaPipe run here as WebAssembly on your device. The photo never leaves the browser: no server, no analytics, no cookies.",
    privacy: [
      "0 bytes uploaded: your own processor does the work",
      "Libraries load only when first needed",
      "The result is technical; it does not prove authenticity",
    ],
  },
  input: {
    title: "Choose a document image",
    drop: "Drop a photo here",
    dropHint: "JPG, PNG or WebP. The image stays in this tab's memory.",
    choose: "Choose a file",
    camera: "Take a photo",
    sample: "Or use the specimen",
    samples: { scan: "Specimen: scan", photo: "Specimen: photo at an angle" },
    sampleNote:
      "The specimen of the Polish identity card published by the Ministry of the Interior, marked WZORZEC; it is not a real person's data. The angled photo was made from the same specimen.",
    wrongType: "That is not an image. Choose a JPG, PNG or WebP file.",
    readError: "The image could not be read.",
    reset: "Clear everything",
    resetDone: "Cleared. The image and the results were removed from this tab's memory.",
  },
  camera: {
    title: "Photo from the camera",
    hint: "Lay the document on a dark surface, fully in frame, without glare.",
    capture: "Take the photo",
    cancel: "Cancel",
    denied: "No camera access. Allow it in the browser or choose a file.",
    unsupported: "This browser does not give pages a camera. Choose a file.",
    starting: "Starting the camera…",
    preview: "Camera preview",
  },
  pipeline: {
    title: "Processing step by step",
    lead: "Select a step to see its intermediate image. The script openCv/verifyID.py runs the same operations.",
    run: "Analyse again",
    running: "Analysis running",
    loading: "Downloading {name}…",
    steps: {
      original: {
        title: "Original",
        text: "The image scaled down to at most 1600 px on the long side.",
      },
      grayscale: {
        title: "Grayscale",
        text: "cvtColor RGBA → GRAY. Colour is not needed for edges or the threshold.",
      },
      threshold: {
        title: "Threshold",
        text: "A binary image and a 3 × 3 morphological opening against noise, as in verifyID.py.",
      },
      edges: {
        title: "Edges",
        text: "A 5 × 5 Gaussian blur and the Canny detector (thresholds 75 and 200).",
      },
      outline: {
        title: "Document outline",
        text: "The largest convex quadrilateral covering at least 20% of the frame.",
      },
      warped: {
        title: "Straightened",
        text: "A perspective transform to the shape of an ID-1 card (85.6 × 54 mm).",
      },
      ocr: {
        title: "OCR",
        text: "Tesseract (LSTM, Polish + English) in sparse-text mode (PSM 11), on the straightened grayscale image.",
      },
      faces: {
        title: "Faces",
        text: "MediaPipe BlazeFace (short range) on the straightened document.",
      },
    },
    status: {
      idle: "waiting",
      running: "running",
      done: "done",
      error: "error",
      skipped: "skipped",
    },
    thresholdMode: "Threshold",
    otsu: "Automatic (Otsu)",
    manual: "Manual",
    thresholdValue: "Threshold value",
    thresholdUsed: "Threshold used: {value}",
    noOutline:
      "No document edge found: the photo is cropped to the card or the background has a similar colour. OCR runs on the whole frame.",
    outlineFound: "Document outline found.",
    ms: "{value} ms",
    viewerAlt: "{step}: intermediate image of the analysis",
    showBoxes: "Show word boxes",
  },
  ocr: {
    title: "Text read",
    confidence: "Mean confidence: {value}%",
    words: "{value} words",
    empty: "No text. Try a sharper photo or another threshold.",
    source: "Image for OCR",
    sources: {
      warpedGray: "Straightened, grayscale",
      warped: "Straightened, colour",
      threshold: "Thresholded (whole frame)",
    },
    copy: "Copy text",
    copied: "Text copied to the clipboard.",
  },
  mrz: {
    title: "MRZ and check digits",
    lead: "The machine-readable zone (ICAO 9303) is on the back of an ID card and on a passport's data page. A check digit is the 7-3-1 weighted sum modulo 10.",
    notFound:
      "No MRZ on this image. The WZORZEC specimen is the front of the card; the zone is on the back. You can paste an MRZ below.",
    paste: "MRZ to check (2 or 3 lines)",
    pasteHint: "Capital letters, digits and the < sign. One line per row.",
    check: "Check the MRZ",
    examples: "Examples",
    exampleTd1: "ID card TD1 (Utopia, ICAO)",
    exampleTd3: "Passport TD3 (Utopia, ICAO)",
    examplePl: "TD1 matching the PL specimen (generated)",
    invalidInput: "This does not look like a TD1, TD2 or TD3 MRZ.",
    source: { ocr: "read from the image", manual: "pasted by hand" },
    format: "Format",
    fields: {
      documentCode: "Document type",
      issuingState: "Issuing state",
      documentNumber: "Document number",
      nationality: "Nationality",
      birthDate: "Date of birth",
      sex: "Sex",
      expiryDate: "Date of expiry",
      surname: "Surname",
      givenNames: "Given names",
      optionalData: "Optional data",
    },
    checkFields: {
      documentNumber: "Document number",
      birthDate: "Date of birth",
      expiryDate: "Date of expiry",
      optional: "Optional data",
      composite: "Composite digit",
    },
    digit: "printed {expected}, computed {computed}",
    valid: "valid",
    invalid: "invalid",
  },
  faces: {
    title: "Faces found",
    count: "Faces: {value}",
    none: "No face found.",
    score: "confidence {value}%",
    crop: "Face crop {n}, confidence {score}%",
    note: "An ID card usually has two faces: the main photo and a smaller ghost image. Finding a face is not matching it to a person.",
  },
  country: {
    title: "Declared country",
    label: "Country stated by the user",
    hint: "As in verifyID.py: does the country appear in the document text or in the MRZ.",
  },
  result: {
    title: "Result",
    badge: "Technical result",
    summary: "{pass} of {total} checks passed",
    disclaimer:
      "This is an image-processing prototype. It does not confirm that the document is genuine or that it belongs to the person showing it.",
    checked: "Checked",
    notChecked: "Not checked in this version",
    waiting: "Choose an image and the result appears here.",
    export: "Download the JSON report",
    exportNote: "The report holds the results and the text, no images.",
    statuses: { pass: "passed", fail: "failed", warn: "warning", info: "info" },
    checks: {
      image: { title: "Image loaded", detail: "{width} × {height} px after scaling" },
      outline: {
        title: "Document outline",
        pass: "found and straightened",
        warn: "not found, the whole frame was used",
      },
      ocr: {
        title: "Text read (OCR)",
        detail: "{chars} characters, mean confidence {confidence}%",
      },
      country: {
        title: "Country in the document: {country}",
        pass: "found: {evidence}",
        fail: "not found in the text or the MRZ",
      },
      mrzFound: { title: "MRZ", pass: "found ({format})", info: "not found on this image" },
      mrzDigits: { title: "MRZ check digits", detail: "{valid} of {total} valid" },
      mrzExpiry: {
        title: "Expiry date from the MRZ",
        pass: "{date}, the document is valid",
        fail: "{date}, expired or not a date",
      },
      mrzMatchesText: {
        title: "MRZ matches the printed front",
        pass: "number and surname found in the text",
        warn: "1 of 2 found (number, surname)",
        fail: "neither the number nor the surname is in the text",
      },
      face: { title: "Face on the document", detail: "found: {count}" },
    },
    notCheckedItems: {
      securityFeatures: "Physical security features: hologram, OVI ink, microprint, UV",
      chip: "The e-ID chip (NFC) and its digital signature",
      liveness: "Whether a live person is in front of the camera (liveness)",
      faceMatch: "Matching the document's face to the person (selfie)",
      registers: "Registers of lost and revoked documents",
      tampering: "Signs of an edited photo or replaced data",
    },
  },
  footer: {
    status:
      "An educational prototype. Do not use it for identity decisions. Code and the Python scripts: the id-verification repository on GitHub.",
    source: "Source code (new tab)",
    libraries:
      "OpenCV.js, Tesseract.js, MediaPipe Tasks: Apache-2.0. Card specimen: Polish Ministry of the Interior.",
  },
  progress: {
    opencv: "OpenCV.js (up to 11 MB)",
    tesseract: "Tesseract and language data (up to 10 MB)",
    mediapipe: "MediaPipe (up to 14 MB)",
    done: "Analysis finished: {summary}.",
    failed: "Step {step} failed: {message}",
  },
};

const MESSAGES: Record<Lang, Messages> = { pl, en };
const STORAGE_KEY = "idv.lang";

/** Fills `{name}` placeholders. */
export function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pl" || stored === "en") return stored;
  } catch {
    // storage blocked: fall through to the default
  }
  return "pl";
}

@Injectable({ providedIn: "root" })
export class I18n {
  readonly lang = signal<Lang>(initialLang());
  readonly t = computed(() => MESSAGES[this.lang()]);
  readonly locale = computed(() => (this.lang() === "pl" ? "pl-PL" : "en-GB"));

  constructor() {
    effect(() => {
      const lang = this.lang();
      document.documentElement.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // the choice just is not remembered
      }
    });
  }

  fill = fill;
}
