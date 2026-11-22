# Repozytorium: opis i tagi

Rzeczy, które ustawia się na GitHubie ręcznie (nie da się ich zapisać w plikach repozytorium). Przegląd projektu: [README](../README.md). Nazwa repozytorium zgodna z `reops/standards/repo-names.md`.

## Opis i tagi (About)

GitHub: strona repozytorium → ⚙ obok „About” → pola poniżej. Opis ma limit 350 znaków, tagi (topics) pisze się małymi literami z myślnikami, najwyżej 20.

**Opis (Description):**

```text
ID-document check that runs entirely in the browser (Angular, OpenCV.js, Tesseract.js, MediaPipe): step-by-step preprocessing, OCR, MRZ check digits (ICAO 9303) and face detection, with nothing uploaded. A prototype, not an authenticity check; the original Python scripts are included.
```

**Strona (Website):** `https://damtchorzewski.github.io/id-verification/`

**Tagi (Topics):**

```text
angular typescript opencv tesseract ocr mrz icao-9303 webassembly mediapipe face-detection computer-vision image-processing id-verification kyc privacy github-pages python
```

Z GitHub CLI (`gh`) to samo jedną komendą:

```bash
gh repo edit DamTchorzewski/id-verification --description "ID-document check that runs entirely in the browser (Angular, OpenCV.js, Tesseract.js, MediaPipe): step-by-step preprocessing, OCR, MRZ check digits (ICAO 9303) and face detection, with nothing uploaded. A prototype, not an authenticity check; the original Python scripts are included." --homepage "https://damtchorzewski.github.io/id-verification/" --add-topic angular,typescript,opencv,tesseract,ocr,mrz,icao-9303,webassembly,mediapipe,face-detection,computer-vision,image-processing,id-verification,kyc,privacy,github-pages,python --remove-topic svm,scikit-learn,identity-verification
```

## Nowe repozytorium

Repozytorium powstało przez rozdzielenie `Id-Verification-And-Neural-Network`. Na GitHubie trzeba je utworzyć (puste, bez README), potem lokalnie:

```bash
git remote add origin https://github.com/DamTchorzewski/id-verification.git
git push -u origin main develop
```

## Ustawienia do włączenia

| Gdzie (GitHub)                                          | Co ustawić                                              |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Settings → General → Default branch                     | `main`                                                  |
| Settings → Branches (albo Rulesets) → `main`, `develop` | zablokuj force push i usuwanie gałęzi                   |
| Settings → Pages → Build and deployment → Source        | **GitHub Actions** (deploy z `main` przez `deploy.yml`) |
| Settings → Environments → `github-pages`                | Deployment branches → Selected branches: tylko `main`   |
| Settings → Code security                                | Dependabot alerts i security updates, secret scanning   |
