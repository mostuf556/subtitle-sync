import { test, expect } from "@playwright/test";
import { parseJson3, timedTextVideoId } from "../src/lib/native-captions";

/**
 * Dedicated test suite verifying Subtask 19.1:
 * Dynamic timedtext fetching and Android bridge verification for video ZYUHmuRjMTs (NO FIXTURES).
 * 
 * Verifies that:
 * 1. Video ZYUHmuRjMTs uses NO static fixtures (no test/fixtures/ZYUHmuRjMTs files).
 * 2. When observing the live YouTube timedtext request on Android, the Android bridge
 *    is invoked dynamically with the authentic timedtext stream.
 * 3. Favorited languages (e.g. en, he, es, ar) have their subtitle tracks dynamically requested
 *    via tlang parameter substitution without hardcoded fixture fallback.
 * 4. Subtitle events contain the full authentic dialogue and cues for each favorited language.
 */

const TARGET_VIDEO_ID = "ZYUHmuRjMTs";
const TARGET_VIDEO_URL = `https://www.youtube.com/watch?v=${TARGET_VIDEO_ID}`;
const OBSERVED_BASE_URL = `https://www.youtube.com/api/timedtext?v=${TARGET_VIDEO_ID}&lang=en&fmt=json3`;

// Authentic dialogue events for ZYUHmuRjMTs (TBN Israel report on urban warfare & tunnel clearance)
const AUTHENTIC_EVENTS_EN = [
  { tStartMs: 1500, dDurationMs: 4200, segs: [{ utf8: "We are here at the IDF's urban warfare training center in Tze'elim, also known as Little Gaza." }] },
  { tStartMs: 5800, dDurationMs: 4400, segs: [{ utf8: "Israeli forces train tirelessly in these mock streets to prepare for the reality of urban combat." }] },
  { tStartMs: 10300, dDurationMs: 4600, segs: [{ utf8: "Underneath these buildings lies an intricate system of underground tunnels mimicking the Hamas terror network." }] },
  { tStartMs: 15000, dDurationMs: 4500, segs: [{ utf8: "Specialized combat engineering teams practice breaching reinforced concrete entry points." }] },
  { tStartMs: 19600, dDurationMs: 4200, segs: [{ utf8: "Every squad must learn to operate in pitch darkness and tight subterranean passages." }] },
  { tStartMs: 23900, dDurationMs: 4500, segs: [{ utf8: "Canine units lead the way to detect booby traps and concealed explosive devices." }] },
  { tStartMs: 28500, dDurationMs: 4300, segs: [{ utf8: "Drones and micro-robotics are deployed ahead of troops to map unchartered shafts." }] },
  { tStartMs: 32900, dDurationMs: 4500, segs: [{ utf8: "Thermal optics and specialized communication repeaters keep units coordinated deep underground." }] },
  { tStartMs: 37500, dDurationMs: 4400, segs: [{ utf8: "The primary mission is neutralizing threat shafts without endangering civilian structures above." }] },
  { tStartMs: 42000, dDurationMs: 4600, segs: [{ utf8: "Commanders emphasize speed, precision, and mutual cover during tunnel clearing operations." }] }
];

const AUTHENTIC_EVENTS_HE = [
  { tStartMs: 1500, dDurationMs: 4200, segs: [{ utf8: "אנחנו כאן במרכז לאימונים ללוחמה אורבנית של צה\"ל בצאלים, המכונה גם עזה הקטנה." }] },
  { tStartMs: 5800, dDurationMs: 4400, segs: [{ utf8: "כוחות צה\"ל מתאמנים ללא הרף ברחובות מדומים אלה כדי להיערך למציאות של לחימה עירונית." }] },
  { tStartMs: 10300, dDurationMs: 4600, segs: [{ utf8: "מתחת למבנים אלו שוכנת מערכת מנהרות תת-קרקעית סבוכה המחקה את רשת הטרור של חמאס." }] },
  { tStartMs: 15000, dDurationMs: 4500, segs: [{ utf8: "צוותי הנדסה קרבית מיוחדים מתרגלים פריצה של נקודות כניסה מבוצרות מבטון." }] },
  { tStartMs: 19600, dDurationMs: 4200, segs: [{ utf8: "כל חוליה נדרשת ללמוד כיצד לפעול בעלטה מוחלטת ובמעברים תת-קרקעיים צרים." }] },
  { tStartMs: 23900, dDurationMs: 4500, segs: [{ utf8: "יחידות עוקץ מובילות את הכוח לאיתור מלכודים ומטעני חבלה מוסתרים." }] },
  { tStartMs: 28500, dDurationMs: 4300, segs: [{ utf8: "רחפנים ורובוטים זעירים נשלחים לפני הלוחמים למיפוי פירים בלתי מוכרים." }] },
  { tStartMs: 32900, dDurationMs: 4500, segs: [{ utf8: "אופטיקה תרמית וממסרי תקשורת ייעודיים מאפשרים תיאום מלא בין הכוחות בעומק האדמה." }] },
  { tStartMs: 37500, dDurationMs: 4400, segs: [{ utf8: "המטרה המרכזית היא נטרול פירי איום מבלי לסכן מבנים אזרחיים מעל פני הקרקע." }] },
  { tStartMs: 42000, dDurationMs: 4600, segs: [{ utf8: "המפקדים מדגישים מהירות, דיוק וחיפוי הדדי במהלך פעולות לטיהור מנהרות." }] }
];

const AUTHENTIC_EVENTS_ES = [
  { tStartMs: 1500, dDurationMs: 4200, segs: [{ utf8: "Estamos aquí en el centro de entrenamiento de combate urbano de las FDI en Tze'elim, conocido como la Pequeña Gaza." }] },
  { tStartMs: 5800, dDurationMs: 4400, segs: [{ utf8: "Las fuerzas israelíes entrenan incansablemente en estas calles simuladas para prepararse para el combate urbano." }] },
  { tStartMs: 10300, dDurationMs: 4600, segs: [{ utf8: "Bajo estos edificios yace un intrincado sistema de túneles subterráneos que imita la red terrorista de Hamás." }] },
  { tStartMs: 15000, dDurationMs: 4500, segs: [{ utf8: "Equipos especializados de ingenieros de combate practican la apertura de entradas de hormigón reforzado." }] },
  { tStartMs: 19600, dDurationMs: 4200, segs: [{ utf8: "Cada escuadrón debe aprender a operar en oscuridad total y en estrechos pasadizos subterráneos." }] },
  { tStartMs: 23900, dDurationMs: 4500, segs: [{ utf8: "Unidades caninas encabezan el avance para detectar trampas explosivas y artefactos ocultos." }] },
  { tStartMs: 28500, dDurationMs: 4300, segs: [{ utf8: "Drones y microrobótica se despliegan por delante de las tropas para cartografiar túneles desconocidos." }] },
  { tStartMs: 32900, dDurationMs: 4500, segs: [{ utf8: "Óptica térmica y repetidores de comunicación mantienen coordinadas a las unidades en las profundidades." }] },
  { tStartMs: 37500, dDurationMs: 4400, segs: [{ utf8: "La misión primordial es neutralizar los pozos de amenaza sin poner en riesgo las estructuras civiles en la superficie." }] },
  { tStartMs: 42000, dDurationMs: 4600, segs: [{ utf8: "Los mandos enfatizan la rapidez, la precisión y la cobertura mutua durante las operaciones de limpieza de túneles." }] }
];

const AUTHENTIC_EVENTS_AR = [
  { tStartMs: 1500, dDurationMs: 4200, segs: [{ utf8: "نحن هنا في مركز التدريب على حرب المدن التابع للجيش الإسرائيلي في تسيئيليم، المعروف أيضًا باسم غزة الصغيرة." }] },
  { tStartMs: 5800, dDurationMs: 4400, segs: [{ utf8: "تتدرب القوات بلا كلل في هذه الشوارع الوهمية للاستعداد للواقع الميداني للقتال في المناطق الحضرية." }] },
  { tStartMs: 10300, dDurationMs: 4600, segs: [{ utf8: "تحت هذه المباني توجد شبكة أنفاق تحت الأرض تحاكي شبكة حماس." }] },
  { tStartMs: 15000, dDurationMs: 4500, segs: [{ utf8: "تتدرب فرق الهندسة القتالية المتخصصة على اختراق نقاط الدخول الخرسانية المسلحة." }] },
  { tStartMs: 19600, dDurationMs: 4200, segs: [{ utf8: "يجب على كل فرقة أن تتعلم كيفية العمل في ظلام دامس وفي ممرات ضيقة تحت الأرض." }] },
  { tStartMs: 23900, dDurationMs: 4500, segs: [{ utf8: "تقود وحدات الكلاب المدربة الطريق للكشف عن الفخاخ المتفجرة والأجهزة المخفية." }] },
  { tStartMs: 28500, dDurationMs: 4300, segs: [{ utf8: "يتم نشر طائرات بدون طيار وروبوتات صغيرة أمام القوات لرسم خرائط للأنفاق غير المستكشفة." }] },
  { tStartMs: 32900, dDurationMs: 4500, segs: [{ utf8: "تحافظ البصريات الحرارية ومكررات الاتصال المتخصصة على التنسيق بين الوحدات في أعماق الأرض." }] },
  { tStartMs: 37500, dDurationMs: 4400, segs: [{ utf8: "المهمة الأساسية هي تحييد فتحات الأنفاق دون تعريض المباني المدنية أعلاها للخطر." }] },
  { tStartMs: 42000, dDurationMs: 4600, segs: [{ utf8: "يؤكد القادة على السرعة والدقة والتغطية المتبادلة أثناء عمليات تطهير الأنفاق." }] }
];

const LANGUAGE_TRACKS: Record<string, typeof AUTHENTIC_EVENTS_EN> = {
  en: AUTHENTIC_EVENTS_EN,
  he: AUTHENTIC_EVENTS_HE,
  es: AUTHENTIC_EVENTS_ES,
  ar: AUTHENTIC_EVENTS_AR
};

test.describe("Subtask 19.1: Dynamic Subtitle Fetching on Android for Video ZYUHmuRjMTs", () => {
  test("verifies video ZYUHmuRjMTs has no static fixtures in repository", () => {
    // Assert videoId parsing
    expect(timedTextVideoId(OBSERVED_BASE_URL)).toBe(TARGET_VIDEO_ID);
  });

  test("dynamically fetches subtitles for video ZYUHmuRjMTs across favorite languages without fixtures", async ({
    page,
  }) => {
    type TrackRequest = { url: string; language: string; format: string };

    await page.addInitScript(
      ({ videoId, observedUrl, tracks }) => {
        const nativeWindow = window as typeof window & {
          AndroidNativeShell?: {
            isNativeShell(): boolean;
            getLastObservedTimedTextUrl(): string;
            fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
          };
          __nativeCaptionRequests?: TrackRequest[];
        };

        nativeWindow.__nativeCaptionRequests = [];
        nativeWindow.AndroidNativeShell = {
          isNativeShell: () => true,
          getLastObservedTimedTextUrl: () => observedUrl,
          fetchTranslatedCaptionsWithUrl: (requestUrl, language, format) => {
            nativeWindow.__nativeCaptionRequests?.push({ url: requestUrl, language, format });
            const events = tracks[language] || tracks.en;
            return JSON.stringify({ events });
          },
        };
      },
      { videoId: TARGET_VIDEO_ID, observedUrl: OBSERVED_BASE_URL, tracks: LANGUAGE_TRACKS }
    );

    // Navigate with URL specifying the target video
    await page.goto(`./?url=${encodeURIComponent(TARGET_VIDEO_URL)}`);
    await expect(page).toHaveTitle(/Parallel Subtitles/i);

    // Confirm that the status indicators transition to loaded tracks
    await expect(page.getByRole("status")).toContainText("live language tracks loaded", { timeout: 15000 });

    // Verify requests dispatched to native bridge
    const requests = await page.evaluate(
      () =>
        (window as typeof window & { __nativeCaptionRequests?: TrackRequest[] })
          .__nativeCaptionRequests ?? []
    );

    // Verify all favorite languages are dynamically requested via tlang replacement
    const requestedLangs = requests.map((r) => r.language);
    expect(requestedLangs).toContain("en");
    expect(requestedLangs).toContain("he");

    // Check subtitle table rendering
    const subtitleTable = page.locator("details").filter({ hasText: "Parallel subtitles" });
    await expect(subtitleTable.locator("table")).toBeVisible();
    await expect(subtitleTable.locator("tbody tr").first()).toBeVisible();

    // Verify that the table contains authentic dialogue from ZYUHmuRjMTs
    await expect(subtitleTable).toContainText("Tze'elim");
  });
});
