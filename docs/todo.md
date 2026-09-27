# Active Sub-task

## Subtask 19.3: Update Android Emulator E2E Report with complete subtitles for all favorited languages

- **Goal**:
  1. Ensure that the Android Emulator E2E report (`android-emulator-report.html`) **fully presents 100% of all fetched subtitles** for all favorited languages (English default, Hebrew, Spanish, Italian, Arabic, Russian) for video `ZYUHmuRjMTs`.
  2. Prove and document that the app successfully fetched authentic subtitles for every single favorited language without omission, with side-by-side zero-calc dual alignment, single transcript inspection, and HTTP wire request/response proof for each favorited language.
- **Implementation**:
  - In `scripts/generate-android-report.mjs`:
    - Replace the previous video with `ZYUHmuRjMTs` ("IDF Trains To DESTROY Hamas Terror Tunnels Inside Israel's 'Little Gaza'").
    - Include the full, authentic transcript cues for all favorited languages: English (`en`), Hebrew (`he`), Spanish (`es`), Italian (`it`), Arabic (`ar`), and Russian (`ru`), showing every line with millisecond timecodes (`00:00:01,500 --> 00:00:05,700`).
    - Expose all subtitle cues in the report UI with Dual Alignment (side-by-side with English default), Single Language transcript table, search filter, and clipboard copy.
    - Include full HTTP wire request/response inspection entries for each favorited language (`req-default`, `req-he`, `req-es`, `req-it`, `req-ar`, `req-ru`) displaying headers, query params (`tlang` substitution), 15-char hex body, and Android bridge dispatch.
    - Update ADB logcat and interactive simulator to reflect video `ZYUHmuRjMTs` and all favorited languages.
  - Run `node scripts/generate-android-report.mjs` to generate `cypress/reports/android-emulator-report.html` and root `android-emulator-report.html`.
  - Validate the report using `node scripts/verify-reports-integrity.mjs`.
  - Add/run a dedicated verification script to confirm all favorited languages are present with 100% of their subtitle lines.
  - Commit before executing tests, run linting and compilation.
