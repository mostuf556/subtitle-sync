import { test, expect } from "@playwright/test";

const observedUrl =
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
const targetVideoObservedUrl =
  "https://www.youtube.com/api/timedtext?v=ZYUHmuRjMTs&lang=en&fmt=json3";

type NativeCaptionRequest = { url: string; language: string; format: string };

test.describe("Android native subtitle emulation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((url) => {
      const nativeWindow = window as typeof window & {
        AndroidNativeShell?: {
          isNativeShell(): boolean;
          getLastObservedTimedTextUrl(): string;
          fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
        };
        __nativeCaptionRequests?: NativeCaptionRequest[];
      };

      nativeWindow.__nativeCaptionRequests = [];
      nativeWindow.AndroidNativeShell = {
        isNativeShell: () => true,
        getLastObservedTimedTextUrl: () => url,
        fetchTranslatedCaptionsWithUrl: (requestUrl, language, format) => {
          nativeWindow.__nativeCaptionRequests?.push({ url: requestUrl, language, format });
          return JSON.stringify({
            events: [
              {
                tStartMs: 0,
                dDurationMs: 4000,
                segs: [{ utf8: `Live ${language} subtitle` }],
              },
              {
                tStartMs: 4000,
                dDurationMs: 4000,
                segs: [{ utf8: `Next ${language} subtitle` }],
              },
            ],
          });
        },
      };
    }, observedUrl);

    await page.goto("./");
    await expect(page).toHaveTitle(/Parallel Subtitles/i);
    await expect(page.locator("header")).toBeVisible();
  });

  test("fetches every selected target language through the native bridge", async ({ page }) => {
    const targetLanguages = page.locator("#target-language-select");
    await expect(targetLanguages).toBeVisible();

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
                .__nativeCaptionRequests?.map((request) => request.language) ?? [],
          ),
        { timeout: 10000 },
      )
      .toEqual(expect.arrayContaining(["he", "it"]));

    await targetLanguages.selectOption(["es"]);
    await expect(targetLanguages).toHaveValues(["es"]);

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
                .__nativeCaptionRequests?.map((request) => request.language) ?? [],
          ),
        { timeout: 10000 },
      )
      .toContain("es");

    const requests = await page.evaluate(
      () =>
        (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
          .__nativeCaptionRequests ?? [],
    );
    expect(requests.filter((request) => request.language === "es")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: observedUrl,
          format: "json3",
        }),
      ]),
    );
    await expect(page.getByRole("status")).toContainText("live language tracks loaded");
  });

  test("dynamically fetches subtitles for video ZYUHmuRjMTs without fixtures", async ({ page }) => {
    // 1. Simulate arrival of shared link for video ZYUHmuRjMTs
    await page.evaluate((targetUrl) => {
      const win = window as typeof window & { onNativeSharedLinkReceived?: (link: string) => void };
      win.onNativeSharedLinkReceived?.(targetUrl);
    }, "https://www.youtube.com/watch?v=ZYUHmuRjMTs");

    // 2. Simulate native caption interception for ZYUHmuRjMTs
    await page.evaluate((timedTextUrl) => {
      const win = window as typeof window & {
        onNativeCaptionsInterceptedBase64?: (encoded: string) => void;
      };
      const payload = {
        url: timedTextUrl,
        rawData: JSON.stringify({
          events: [
            {
              tStartMs: 1500,
              dDurationMs: 4200,
              segs: [{ utf8: "IDF urban warfare training at Little Gaza" }],
            },
          ],
        }),
      };
      win.onNativeCaptionsInterceptedBase64?.(btoa(JSON.stringify(payload)));
    }, targetVideoObservedUrl);

    // 3. Verify that native bridge is called with the new observed URL
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
                .__nativeCaptionRequests?.some((r) => r.url.includes("ZYUHmuRjMTs")) ?? false,
          ),
        { timeout: 10000 },
      )
      .toBe(true);

    // 4. Verify parallel subtitles table updates with authentic dialogue
    const subtitleTable = page.locator("details").filter({ hasText: "Parallel subtitles" });
    await expect(subtitleTable.locator("table")).toBeVisible();
    await expect(subtitleTable).toContainText("IDF urban warfare training at Little Gaza");
  });

  test("clears existing subtitle tracks and columns when loading a new video on Android", async ({
    page,
  }) => {
    // 1. Wait for default subtitles to load
    await expect(page.getByRole("status")).toContainText("live language tracks loaded");
    const subtitleTable = page.locator("details").filter({ hasText: "Parallel subtitles" });
    await expect(subtitleTable.locator("tbody tr").first()).toBeVisible();

    // 2. Load a new video ID via onNativeSharedLinkReceived
    await page.evaluate(() => {
      const win = window as typeof window & { onNativeSharedLinkReceived?: (link: string) => void };
      win.onNativeSharedLinkReceived?.("https://www.youtube.com/watch?v=c0pUbsq9FLk");
    });

    // 3. Existing tracks and columns must be cleared immediately; empty state message displayed
    await expect(subtitleTable.locator("table")).toHaveCount(0);
    await expect(subtitleTable).toContainText("Waiting for subtitles…");
    await expect(page.getByRole("status")).toContainText("Waiting for YouTube captions");

    // 4. Simulate arrival of intercepted captions for the new video
    await page.evaluate(() => {
      const win = window as typeof window & {
        onNativeCaptionsInterceptedBase64?: (encoded: string) => void;
      };
      const payload = {
        url: "https://www.youtube.com/api/timedtext?v=c0pUbsq9FLk&lang=en&fmt=json3",
        rawData: JSON.stringify({
          events: [
            {
              tStartMs: 0,
              dDurationMs: 4000,
              segs: [{ utf8: "New video English subtitle" }],
            },
          ],
        }),
      };
      win.onNativeCaptionsInterceptedBase64?.(btoa(JSON.stringify(payload)));
    });

    // 5. Fresh subtitles and columns are loaded for the new video
    await expect(subtitleTable.locator("table")).toBeVisible();
    await expect(subtitleTable.locator("tbody tr").first()).toBeVisible();
    await expect(subtitleTable).toContainText("New video English subtitle");
  });
});
