import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  createShareableLink,
  parseShareableUrlState,
  DEMO_SITE_BASE_URL,
} from "../src/utils/urlStateManager";
import { APP_VERSION } from "../src/config/appConfig";
import { CURRENT_APK_VERSION } from "../src/utils/apkUpdater";

console.log("=========================================================================");
console.log("🧪 Verifying Subtitles URL Encoding in Share Links & Version 1.0.79 Parity");
console.log("=========================================================================");

const rootDir = process.cwd();

// 1. Verify Encoding of Subtitles URL in Share Links
console.log("\n🔗 Section 1: Subtitles URL Parameter Encoding in createShareableLink");

const sampleRawSubUrl =
  "https://www.youtube.com/api/timedtext?v=vBURridJXZ0&ei=tXPZapuAI-7FhcIP5buasAs&caps=asr&opi=112496729&xoaf=5&xowf=1&xospf=1&hl=iw&ip=0.0.0.0&ipbits=0&expire=1792661029&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cxoaf&signature=BE541CA4F98CBCE73024EAB85B0F2C9C80863998.1848E0A37E2E3788F8CF4A734369BFCA7D490446&key=yt8&kind=asr&lang=iw&fmt=json3&xorb=2&xobt=3&xovt=3&cbr=Chrome&cbrver=155.0.0.0&c=WEB_EMBEDDED_PLAYER&cver=2.20261020.08.00&cplayer=UNIPLAYER&cos=Windows&cosver=10.0&cplatform=DESKTOP&tlang=he";

const shareLinkWithSubUrl = createShareableLink({
  useDemoSiteBase: true,
  minimal: true,
  videoId: "vBURridJXZ0",
  sourceLangCode: "iw",
  subUrl: sampleRawSubUrl,
  targetLangs: ["he"],
});

assert(
  shareLinkWithSubUrl.startsWith(DEMO_SITE_BASE_URL),
  `Link must start with ${DEMO_SITE_BASE_URL}, got: ${shareLinkWithSubUrl}`,
);
assert(
  shareLinkWithSubUrl.includes("subtitles_url="),
  "Shared link must include 'subtitles_url=' parameter",
);
assert(
  !shareLinkWithSubUrl.includes("sub_url="),
  "Shared link must NOT duplicate 'sub_url=' parameter to keep link minimal",
);

// Verify that the subtitles_url query param is properly percent-encoded
const parsedUrl = new URL(shareLinkWithSubUrl);
const extractedSubUrl = parsedUrl.searchParams.get("subtitles_url");

assert.strictEqual(
  extractedSubUrl,
  sampleRawSubUrl,
  "Extracted subtitles_url parameter must match original unencoded raw timedtext URL",
);

console.log("✅ PASS: createShareableLink properly encodes subtitles_url without redundant sub_url duplicate");

// 2. Verify parseShareableUrlState parses both subtitles_url and backwards-compatible sub_url
console.log("\n📥 Section 2: URL State Hydration & Parameter Parsing");

const parsedState = parseShareableUrlState(parsedUrl.search);
assert.strictEqual(
  parsedState.subUrl,
  sampleRawSubUrl,
  "parseShareableUrlState must populate subUrl",
);
assert.strictEqual(
  parsedState.subtitlesUrl,
  sampleRawSubUrl,
  "parseShareableUrlState must populate subtitlesUrl",
);
assert.strictEqual(parsedState.videoId, "vBURridJXZ0");

// Also test legacy sub_url parsing compatibility
const legacyUrl = `${DEMO_SITE_BASE_URL}?v=vBURridJXZ0&sub_url=${encodeURIComponent(sampleRawSubUrl)}`;
const legacyParsedState = parseShareableUrlState(new URL(legacyUrl).search);
assert.strictEqual(legacyParsedState.subtitlesUrl, sampleRawSubUrl);
assert.strictEqual(legacyParsedState.subUrl, sampleRawSubUrl);

console.log("✅ PASS: parseShareableUrlState correctly reconstructs state from encoded link");

// 3. Verify ShareStateModal has editable input and cleans 'subtitles_url:' prefix
console.log("\n🖥️ Section 3: ShareStateModal Subtitles URL Input & Prefix Sanitization");

const shareModalPath = path.resolve(rootDir, "src/components/ShareStateModal.tsx");
assert(fs.existsSync(shareModalPath), "ShareStateModal.tsx must exist");
const shareModalContent = fs.readFileSync(shareModalPath, "utf-8");

assert(
  shareModalContent.includes('data-testid="share-subtitles-url-input"'),
  "ShareStateModal.tsx must render data-testid='share-subtitles-url-input'",
);
assert(
  shareModalContent.includes("subtitles_url:"),
  "ShareStateModal.tsx must handle 'subtitles_url:' prefix stripping on paste/input",
);
assert(
  shareModalContent.includes("window.AndroidNativeShell.getLastObservedTimedTextUrl()"),
  "ShareStateModal.tsx must fall back to AndroidNativeShell.getLastObservedTimedTextUrl()",
);
assert(
  shareModalContent.includes("data-testid=\"btn-refresh-android-sub-url\"") ||
    shareModalContent.includes("btn-refresh-android-sub-url"),
  "ShareStateModal.tsx must provide a button to refresh/fetch captured Android URL",
);

assert(
  shareModalContent.includes("useEffect"),
  "ShareStateModal.tsx must import and use useEffect",
);
assert(
  /import\s+React,\s*\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/.test(shareModalContent),
  "ShareStateModal.tsx must import useEffect from 'react'",
);

console.log("✅ PASS: ShareStateModal has subtitles URL input, prefix sanitization, native bridge fallback, and valid React imports");

// 4. Verify src/routes/index.tsx Hydration Supports subtitles_url
console.log("\n🔄 Section 4: Index Route Hydration");

const indexPath = path.resolve(rootDir, "src/routes/index.tsx");
assert(fs.existsSync(indexPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexPath, "utf-8");

assert(
  indexContent.includes("appState.subUrl || appState.subtitlesUrl"),
  "index.tsx must check both subUrl and subtitlesUrl during hydration",
);
assert(
  indexContent.includes("window.AndroidNativeShell?.getLastObservedTimedTextUrl?.()"),
  "index.tsx must fall back to native shell when passing observedUrl to ShareStateModal",
);

console.log("✅ PASS: src/routes/index.tsx correctly hydrides subtitles_url and feeds native bridge fallback");

// 5. Verify App Version Parity Across All 5 Version Targets
console.log("\n🏷️ Section 5: Version Parity Verification across all 5 Targets");

const expectedVer = "2.0.0";
const expectedCode = "20000";

// Target 1: package.json
const pkgJsonPath = path.resolve(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
assert.strictEqual(pkg.version, expectedVer, `package.json version must be ${expectedVer}`);
console.log(`✅ Target 1: package.json version = ${pkg.version}`);

// Target 2: android-shell/app/build.gradle.kts
const gradlePath = path.resolve(rootDir, "android-shell/app/build.gradle.kts");
const gradleContent = fs.readFileSync(gradlePath, "utf-8");
assert(
  gradleContent.includes(`versionName = "${expectedVer}"`),
  `android-shell/app/build.gradle.kts versionName must be ${expectedVer}`,
);
assert(
  gradleContent.includes(`versionCode = ${expectedCode}`),
  `android-shell/app/build.gradle.kts versionCode must be ${expectedCode}`,
);
console.log(`✅ Target 2: build.gradle.kts versionName = ${expectedVer}, versionCode = ${expectedCode}`);

// Target 3: src/config/appConfig.ts
assert.strictEqual(APP_VERSION, expectedVer, `src/config/appConfig.ts APP_VERSION must be ${expectedVer}`);
console.log(`✅ Target 3: src/config/appConfig.ts APP_VERSION = ${APP_VERSION}`);

// Target 4: src/utils/apkUpdater.ts
assert.strictEqual(
  CURRENT_APK_VERSION,
  `v${expectedVer}`,
  `src/utils/apkUpdater.ts CURRENT_APK_VERSION must be v${expectedVer}`,
);
console.log(`✅ Target 4: src/utils/apkUpdater.ts CURRENT_APK_VERSION = ${CURRENT_APK_VERSION}`);

// Target 5: src/utils/appSettings.ts
const appSettingsPath = path.resolve(rootDir, "src/utils/appSettings.ts");
const appSettingsContent = fs.readFileSync(appSettingsPath, "utf-8");
assert(
  appSettingsContent.includes(`version: "${expectedVer}"`),
  `src/utils/appSettings.ts exportFullAppState snapshot version must be ${expectedVer}`,
);
console.log(`✅ Target 5: src/utils/appSettings.ts export snapshot version = ${expectedVer}`);

console.log("\n=========================================================================");
console.log(`🎉 ALL TESTS PASSED! Subtitles URL encoding & Version ${expectedVer} verified!`);
console.log("=========================================================================");


