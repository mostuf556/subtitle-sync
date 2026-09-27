# Tasks

## Task 19: Dynamic Android Subtitle Fetching and Emulator Report for Video ZYUHmuRjMTs

- [x] **Subtask 19.1: Dynamic timedtext fetching and Android bridge verification for video ZYUHmuRjMTs (no fixtures)**: Configure dynamic caption fetching for `https://www.youtube.com/watch?v=ZYUHmuRjMTs` through the Android native bridge and network interceptor without fixture fallbacks, fetching authentic subtitles across selected favorite languages (e.g. English, Hebrew, Spanish, Arabic) via native `tlang` query replacement.
- [x] **Subtask 19.2: Dedicated E2E tests for Android dynamic subtitle fetching on video ZYUHmuRjMTs**: Update Cypress (`cypress/e2e/emulation.cy.ts`) and Playwright (`e2e/emulation.spec.ts`) test suites to navigate to `ZYUHmuRjMTs` without fixtures, assert real-time caption observation, and verify that all selected favorite languages fetch their respective subtitle tracks.
- [ ] **Subtask 19.3: Update Android Emulator E2E Report with complete subtitles for all favorited languages**: Update `scripts/generate-android-report.mjs` and `android-emulator-report.html` to fully present 100% of all fetched subtitle lines and dialogue cues for video `ZYUHmuRjMTs` across all favorited languages (English default, Hebrew, Spanish, Italian, Arabic, Russian), with side-by-side zero-calc dual alignment, single transcript inspection, full HTTP timedtext wire request/response proof for each favorited language, and report integrity validation.

## Task 17: Restore default language subtitle fetching and favorite languages `tlang` replacement on Android

- [ ] **Subtask 17.1: Restore default language subtitle fetching and favorite languages `tlang` replacement on Android**: When observing the network request for default subtitles, ensure the default language track is preserved/fetched without an invalid `tlang`, and replace `tlang` with each favorite language's code to fetch all favorite languages as implemented in `mostuf2556/Youtubenet6`. Add dedicated tests, commit before execution, test, and verify.

## Task 18: Fix SSR-Client hydration mismatch in `targetLanguages`

- [x] **Subtask 18.1: Synchronize SSR and Client initial render for `targetLanguages` and dynamic client-only state**: Ensure initial server rendering and client hydration pass share the deterministic default state without accessing client-only localStorage before mount, deferring localStorage synchronization to post-hydration. Add dedicated regression test, commit before execution, test, and verify.

## Task 16: Align favorite languages, TTS settings, video reset, multi-track audio mode, and auto-scroll default with mostuf2556/Youtubenet6

- [x] **Subtask 16.1: Favorite languages and main screen controls**: Expose favorite/desired languages selector on web demo (fixture tracks) and Android (catalog with `tlang` fetching). On the main screen, present only favorite languages for show/hide, speech toggles, ordering, and per-language TTS speech rate and voice selection.
- [x] **Subtask 16.2: Clear columns on new video on Android**: When loading a video other than the default video on Android, clear existing subtitle tracks and columns before fetching fresh subtitles for all favorite languages.
- [x] **Subtask 16.3: YouTube multi-audio track repeat mode**: Add an option to switch to "Audio-track mode" (repeating video segments with the native audio track for supported languages instead of synthesized TTS). Default this option to OFF.
- [x] **Subtask 16.4: Disable auto-focus and scroll by default**: Change "Auto-focus and scroll to current subtitle" (`autoScroll`) to default to `false` (off).
- [x] **Subtask 16.5: E2E testing & verification**: Update and verify test suites (`e2e/web.spec.ts`, `e2e/app.spec.ts`, `e2e/emulation.spec.ts`), commit before testing, and run `npm run build`, `npm run lint`, and integrity tests.
