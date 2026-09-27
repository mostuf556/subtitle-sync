# Active Sub-task

## Subtask 19.2: Dedicated E2E tests for Android dynamic subtitle fetching on video ZYUHmuRjMTs

- **Goal**:
  1. Update Cypress (`cypress/e2e/emulation.cy.ts`) and Playwright (`e2e/emulation.spec.ts`) E2E test suites to test dynamic subtitle fetching for `https://www.youtube.com/watch?v=ZYUHmuRjMTs` without fixtures.
  2. Assert real-time subtitle observation, verify favorite language selections (`en`, `he`, `es`, `ar`), and validate `tlang` substitution.
- **Implementation**:
  - Update `cypress/e2e/emulation.cy.ts` to navigate to `ZYUHmuRjMTs`, test caption toggle and subtitle observation, verify target language switching (`es`, `he`), and assert that authentic subtitles are loaded without fixture reliance.
  - Update `e2e/emulation.spec.ts` with test coverage for video `ZYUHmuRjMTs` validating dynamic native bridge dispatch, favorite language fetching, and table rendering.
  - Commit changes and dedicated tests before executing them.
  - Run linting and test execution checks.
