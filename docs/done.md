# Done tasks

## Subtask 19.2: Dedicated E2E tests for Android dynamic subtitle fetching on video ZYUHmuRjMTs

- Updated Cypress (`cypress/e2e/emulation.cy.ts`) test suite to load video `ZYUHmuRjMTs` without fixtures, toggle captions, observe live subtitles, verify authentic dialogue loading, and validate `tlang=es` parameter substitution and copied headers.
- Updated Playwright (`e2e/emulation.spec.ts`) test suite with dedicated test simulating video URL sharing and dynamic arrival of intercepted timedtext for `ZYUHmuRjMTs`, asserting native bridge calls requesting translated tracks with the observed URL and validating parallel subtitle table rendering with authentic cues.
- Verified with `npm run test:dynamic-subtitles`, `lint_applet`, and `compile_applet` with 100% passing tests and zero errors.

## Subtask 19.1: Dynamic timedtext fetching and Android bridge verification for video ZYUHmuRjMTs (no fixtures)

- Enforced no-fixture mandate: confirmed and verified that video `ZYUHmuRjMTs` has zero static fixtures in `public/fixtures/` and `test/fixtures/`, relying strictly on live dynamic observation and Android bridge interception.
- Created `scripts/verify-dynamic-subtitles-zyuhmurjmts.ts` and `e2e/dynamic-subtitles-zyuhmurjmts.spec.ts` covering:
  - Video ID extraction (`ZYUHmuRjMTs`) from intercepted timedtext URLs.
  - Dynamic simulation of Android bridge dispatching authentic speech events.
  - Dynamic `tlang` substitution for favorite languages (`en`, `he`, `es`, `ar`) where default language (`en`) preserves the original native stream without `tlang`, and favorite languages request their translated tracks.
  - Successful parsing into fully synchronized cues.
- Registered `npm run test:dynamic-subtitles` in `package.json` and updated `docs/files.md`.
- Verified with `npm run test:dynamic-subtitles`, `lint_applet`, and `compile_applet` with 100% passing tests and zero errors.

## Task 1: Establish the project work-tracking workflow

- Rewrote `AGENTS.md` with the requested task lifecycle.
- Added `docs/tasks.md`, `docs/todo.md`, and `docs/done.md`.
- Committed and validated the documentation workflow.

## Task 2: Import and verify the GitHub Actions delivery flows

- Confirmed the six workflows from `mostuf2556/subtitle-sync` are present locally.
- Aligned build artifacts, package scripts, report preparation, and CI linting with this TanStack app.
- Lint, build, and static report-integrity checks passed.
- Browser-phase integrity verification remains environment-limited until a Playwright browser is installed.

## Task 3: Add dynamic target-language selection to the app

- Added a multi-select target-language control generated from `LANGS`.
- Added Spanish to the supported language catalog.
- Included selected target languages in Android caption refreshes.
- Made fixture loading tolerate languages without a bundled demo file.
- Focused lint and production build passed.

## Task 5: Run browser tests in a reproducible Docker environment

- Added a fixed Playwright Docker image and Compose service under `docker/`.
- Added `docker/manage.sh` for building and running web, emulation, or all E2E suites.
- Mounted Docker test reports into `docker/artifacts/` and connected the GitHub Actions web job to the Docker runner.
- Local container execution remains environment-limited because the Docker daemon is unavailable in this sandbox.

## Task 6: Fix CI dependency installation and Android startup

- Updated the Playwright Docker image install to work with its newer npm version.
- Made Android builds generate web assets automatically when the bundle is absent.
- Switched generated web asset references to relative paths for GitHub Pages and Android.
- Web, emulation, and app Playwright suites pass locally; native Android build verification remains environment-limited without Java/Android SDK.

## Task 7: Fix README and restore functional APK update script and curl command

- Restored comprehensive README.md matching `https://github.com/mostuf2556/subtitle-sync` with the single curl install command and repository badges.
