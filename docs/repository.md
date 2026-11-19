# Repozytorium: opis i tagi

Rzeczy, które ustawia się na GitHubie ręcznie (nie da się ich zapisać w plikach repozytorium). Przegląd projektu: [README](../README.md). Nazwa repozytorium zgodna z `reops/standards/repo-names.md`.

## Opis i tagi (About)

GitHub: strona repozytorium → ⚙ obok „About” → pola poniżej. Opis ma limit 350 znaków, tagi (topics) pisze się małymi literami z myślnikami, najwyżej 20.

**Opis (Description):**

```text
Python prototype of an automated identity-document check: reads the document photo with OCR, compares the declared country with the text, finds the face with OpenCV and classifies images with an SVM. A base for faster, cheaper customer onboarding (KYC) than manual review.
```

**Strona (Website):** puste (skrypty, nie ma strony).

**Tagi (Topics):**

```text
python opencv ocr tesseract kyc id-verification identity-verification computer-vision face-detection image-processing svm scikit-learn
```

Z GitHub CLI (`gh`) to samo jedną komendą:

```bash
gh repo edit DamTchorzewski/id-verification --description "Python prototype of an automated identity-document check: reads the document photo with OCR, compares the declared country with the text, finds the face with OpenCV and classifies images with an SVM. A base for faster, cheaper customer onboarding (KYC) than manual review." --add-topic python,opencv,ocr,tesseract,kyc,id-verification,identity-verification,computer-vision,face-detection,image-processing,svm,scikit-learn
```

## Nowe repozytorium

Repozytorium powstało przez rozdzielenie `Id-Verification-And-Neural-Network`. Na GitHubie trzeba je utworzyć (puste, bez README), potem lokalnie:

```bash
git remote add origin https://github.com/DamTchorzewski/id-verification.git
git push -u origin main develop
```

## Ustawienia do włączenia

| Gdzie (GitHub)                                          | Co ustawić                              |
| ------------------------------------------------------- | --------------------------------------- |
| Settings → General → Default branch                     | `main`                                  |
| Settings → Branches (albo Rulesets) → `main`, `develop` | zablokuj force push i usuwanie gałęzi   |
