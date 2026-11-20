<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/banner-dark.png">
    <img src="docs/images/banner-light.png" alt="id-verification: ID-document check with OpenCV and OCR" width="100%">
  </picture>
</p>

<p align="center">
  <img src="docs/images/showcase.jpg" alt="The idea of the pipeline: a document photo, edge and text detection, OCR, a green verification mark" width="100%">
</p>

## About

**id-verification** is a small set of Python scripts for a basic identity-document check with OpenCV and OCR, plus
the image-processing exercises that led to it. It was split off from the former `Id-Verification-And-Neural-Network`
workspace; the PyTorch part lives in `next-word-prediction`.

- **ID check (`verifyID.py`).** Pre-processes a photo of a document (grayscale, binary threshold, morphological
  opening), reads the text with Tesseract OCR and checks that the declared country of origin appears in it. It
  prints `ID OK` or `Invalid ID`. The sample is the official specimen of a Polish identity card (it says
  *WZORZEC*), not a real person's document.
- **Image operations (`imageTransform.py`).** Load, grayscale, crop, rotate and save an image, Canny edge detection
  and Haar-cascade face detection; the faces are cut out to `face_<n>.jpg`.
- **SVM classifier (`svmModel.py`).** Trains an `SVC` on the GTSRB traffic-sign data set (43 classes, 32 × 32
  histogram-equalised crops) and plots precision, recall and F1 per class. It is a separate experiment: it has nothing
  to do with documents.

> **Status:** a prototype, not a verification system. The ID check is a text match, not a test of
> authenticity (no security features, no face comparison), and no accuracy figure is claimed. The GTSRB data set is
> not in the repository.

## Tech stack

|        |                                                                                    |
| ------ | ---------------------------------------------------------------------------------- |
| Stack  | Python 3 scripts, run one at a time                                                |
| Vision | OpenCV (`cv2`), Tesseract OCR through `pytesseract`                                |
| ML     | scikit-learn (`SVC`, metrics), joblib, pandas, NumPy, matplotlib                   |
| Data   | the sample image in `openCv/path/`; GTSRB downloaded to `data/` (git-ignored)      |
| Tests  | none                                                                               |

Comments are a mix of Polish and English; the README, commits and branches are in English.

## Screenshots

The picture at the top is an illustration of the idea (document photo, edge and text detection, OCR, a verification
mark); it is not output of the scripts. The scripts have no interface of their own: below are the SVM metrics they
saved in `openCv/path/`, drawn in window frames by `tools/readme-images`.

<p align="center">
  <img src="docs/images/metrics.jpg" alt="Class-wise metrics and precision of the traffic-sign SVM" width="100%">
</p>

Other results in `openCv/path/`: `grayscale_image.jpg`, `cropped_image.jpg`, `rotated_image.jpg`, `face_0.jpg` and
`face_1.jpg`.

## Quick start

```bash
git clone https://github.com/DamTchorzewski/id-verification.git
cd id-verification
pip install opencv-python pytesseract numpy pandas scikit-learn joblib matplotlib
python openCv/imageTransform.py     # windows with each step; press a key to continue
python openCv/verifyID.py           # needs Tesseract OCR installed
```

Run the scripts from the **repository root**: the paths inside (`./openCv/path/`, `./data/`) are relative to it.
`verifyID.py` expects Tesseract at `C:\Program Files\Tesseract-OCR\tesseract.exe` (set in the script) and checks the
declared country `Poland` against the text of `openCv/path/image.jpg`. Requirements: Python 3.

## Scripts

| Command                       | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `python openCv/verifyID.py`        | OCR of the document photo and the country check                       |
| `python openCv/imageTransform.py`  | grayscale, crop, rotate, edges and face detection on the sample image |
| `python openCv/svmModel.py`        | train and evaluate the traffic-sign SVM (needs GTSRB in `data/`), writes `traffic_sign_classifier.pkl` |

## Configuration

None: no variables or keys. Settings sit at the top of the scripts: the image path and the declared country in
`verifyID.py`, the Tesseract path in `verifyID.py`, the dataset path in `svmModel.py`.

## Structure

```
openCv/verifyID.py        ★ the ID check
openCv/imageTransform.py  image operations, edges, face detection
openCv/svmModel.py        the traffic-sign classifier
openCv/path/              the sample image and the results the scripts saved
data/                     GTSRB, git-ignored, you download it
docs/                     documentation; docs/images/ holds the README images (generated)
```

The folder is still called `openCv/` because the scripts use that path; renaming it means changing the paths in
all three.

## Branches and workflows

Shared standards from `reops/standards`: `main` ≤ `develop` ≤ a working branch `<type>/<topic>`, fast-forward
merges, Conventional Commits in English. The repository has no workflows.

**Departures from the standards (and why):**

- **No "Open site" button, no phone strip:** scripts with no site; the images are the saved results in window frames,
  and the logo is a wordmark (the project has none).
- **No dependency file, tests, hooks or CI:** a prototype.
- **History starts here:** the scripts were copied from `Id-Verification-And-Neural-Network` (now
  `next-word-prediction`), whose history holds their earlier commits.

## Documentation

| Document                                   | Covers                          |
| ------------------------------------------ | ------------------------------- |
| [docs/repository.md](docs/repository.md)   | GitHub description and topics   |

The README images (`docs/images/`) are regenerated with `tools/readme-images` (profile `id-verification`) from the
images in `openCv/path/`; the working shots go to `.scratch/`.

---

<p align="center"><a href="https://damreboot.pl"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/damreboot/company-dark.svg"><img src="docs/images/damreboot/company-light.svg" alt="damreboot.pl: company website" height="36"></picture></a><a href="https://www.linkedin.com/in/damian-tchorzewski-3b2388275/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/damreboot/linkedin-dark.svg"><img src="docs/images/damreboot/linkedin-light.svg" alt="LinkedIn: let's connect" height="36"></picture></a><a href="mailto:damianchabracki@gmail.com"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/damreboot/email-dark.svg"><img src="docs/images/damreboot/email-light.svg" alt="E-mail: write to me" height="36"></picture></a></p>

<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/damreboot/engineered-dark.svg"><img src="docs/images/damreboot/engineered-light.svg" alt="" height="33" align="middle"></picture> Engineered by <b>Damian Chabracki</b> (DamReboot IT)
</p>
