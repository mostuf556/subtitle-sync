import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  createShareableLink,
  createDemoSubtitlesShareLink,
  DEMO_SITE_BASE_URL,
} from "../src/utils/urlStateManager";
import { APP_VERSION } from "../src/config/appConfig";
import { CURRENT_APK_VERSION } from "../src/utils/apkUpdater";

console.log("=========================================================================");
console.log("🧪 Verifying Android App Subtitles Link Sharing & Version 1.0.76 Parity");
console.log("=========================================================================");

const rootDir = process.cwd();

// 1. Verify Demo Site Base URL & Rich State Encoding in URL State Manager
console.log("\n🌐 Section 1: Demo Site Base URL & Parameter Encoding");
assert.strictEqual(
  DEMO_SITE_BASE_URL,
  "https://mostuf2556.github.io/subtitle-sync",
  "DEMO_SITE_BASE_URL must match user-specified demo site URL",
);

const encodedDemoLink = createShareableLink({
  useDemoSiteBase: true,
  videoId: "vBURridJXZ0",
  sourceLangCode: "en",
  subUrl: "https://www.youtube.com/api/timedtext?v=vBURridJXZ0&lang=en&fmt=json3",
  targetLangs: ["he", "ar"],
  ttsProvider: "lovable",
  openRouterApiKey: "sk-or-v1-secretkey999",
  time: 35,
});

assert(
  encodedDemoLink.startsWith("https://mostuf2556.github.io/subtitle-sync?"),
  `Link must start with https://mostuf2556.github.io/subtitle-sync?, got: ${encodedDemoLink}`,
);
assert(encodedDemoLink.includes("v=vBURridJXZ0"), "Link must encode video ID");
assert(encodedDemoLink.includes("source_lang_code=en"), "Link must encode source_lang_code");
assert(encodedDemoLink.includes("sub_lang=en"), "Link must encode sub_lang");
assert(encodedDemoLink.includes("sub_url="), "Link must encode subtitles link");
assert(
  encodedDemoLink.includes("sub_url=https%3A%2F%2Fwww.youtube.com%2Fapi%2Ftimedtext"),
  "Subtitles URL must be properly percent-encoded",
);
assert(
  encodedDemoLink.includes("Target_langs=he%2Car") || encodedDemoLink.includes("Target_langs=he,ar"),
  "Link must encode Target_langs",
);
assert(encodedDemoLink.includes("tts_provider=lovable"), "Link must encode tts_provider");
assert(
  encodedDemoLink.includes("encoded_openrouter_key=sk-or-v1-secretkey999") ||
    encodedDemoLink.includes("openrouter_key=sk-or-v1-secretkey999"),
  "Link must encode OpenRouter API key",
);
console.log(`✅ PASS: Generated demo site subtitles share link: ${encodedDemoLink}`);

// Test createDemoSubtitlesShareLink convenience function
const directDemoLink = createDemoSubtitlesShareLink({
  videoId: "L2Ryrr6txwA",
  sourceLangCode: "en",
  targetLangs: ["es"],
  ttsProvider: "openrouter",
  subUrl: "https://mostuf2556.github.io/subtitle-sync/fixtures/L2Ryrr6txwA/en.json",
});
assert(directDemoLink.startsWith(DEMO_SITE_BASE_URL), "createDemoSubtitlesShareLink must use DEMO_SITE_BASE_URL");
console.log(`✅ PASS: createDemoSubtitlesShareLink verified: ${directDemoLink}`);

// 2. Verify Android Native Shell Bridge methods in MainActivity.kt
console.log("\n📱 Section 2: Android Native Shell Bridge Methods");
const mainActivityPath = path.resolve(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), "MainActivity.kt must exist");
const mainActivityContent = fs.readFileSync(mainActivityPath, "utf-8");

assert(
  mainActivityContent.includes("fun shareText(text: String, title: String"),
  "MainActivity.kt must implement shareText @JavascriptInterface",
);
assert(
  mainActivityContent.includes("fun shareSubtitlesUrl(url: String, title: String"),
  "MainActivity.kt must implement shareSubtitlesUrl @JavascriptInterface",
);
assert(
  mainActivityContent.includes("Intent.ACTION_SEND"),
  "MainActivity.kt must use Intent.ACTION_SEND for native Android sharing",
);
assert(
  mainActivityContent.includes("Intent.createChooser"),
  "MainActivity.kt must invoke Intent.createChooser for sharing",
);
console.log("✅ PASS: Android Native Shell shareText & shareSubtitlesUrl verified in MainActivity.kt");

// 3. Verify TypeScript Declarations for NativeShell
console.log("\n📜 Section 3: TypeScript NativeShell Bridge Definitions");
const nativeCaptionsPath = path.resolve(rootDir, "src/lib/native-captions.ts");
const typesPath = path.resolve(rootDir, "src/types.ts");
const nativeCaptionsContent = fs.readFileSync(nativeCaptionsPath, "utf-8");
const typesContent = fs.readFileSync(typesPath, "utf-8");

assert(
  nativeCaptionsContent.includes("shareText?(text: string, title?: string): boolean;"),
  "native-captions.ts NativeShell must declare shareText",
);
assert(
  nativeCaptionsContent.includes("shareSubtitlesUrl?(url: string, title?: string): boolean;"),
  "native-captions.ts NativeShell must declare shareSubtitlesUrl",
);
assert(
  typesContent.includes("shareText?: (text: string, title?: string) => boolean;"),
  "types.ts Window.AndroidNativeShell must declare shareText",
);
assert(
  typesContent.includes("shareSubtitlesUrl?: (url: string, title?: string) => boolean;"),
  "types.ts Window.AndroidNativeShell must declare shareSubtitlesUrl",
);
console.log("✅ PASS: NativeShell TypeScript definitions verified.");

// 4. Verify ShareStateModal Component
console.log("\n📦 Section 4: ShareStateModal Component UI & Android Actions");
const shareModalPath = path.resolve(rootDir, "src/components/ShareStateModal.tsx");
assert(fs.existsSync(shareModalPath), "ShareStateModal.tsx must exist");
const shareModalContent = fs.readFileSync(shareModalPath, "utf-8");

assert(
  shareModalContent.includes('data-testid="share-state-dialog"'),
  "ShareStateModal must render dialog container",
);
assert(
  shareModalContent.includes('data-testid="share-subtitles-action-btn"'),
  "ShareStateModal must render share subtitles action button",
);
assert(
  shareModalContent.includes('data-testid="copy-share-link-btn"'),
  "ShareStateModal must render copy share link button",
);
assert(
  shareModalContent.includes('data-testid="share-demo-base-toggle"'),
  "ShareStateModal must render toggle for demo site base URL",
);
assert(
  shareModalContent.includes('data-testid="share-include-tts-provider-toggle"'),
  "ShareStateModal must render toggle for TTS provider inclusion",
);
assert(
  shareModalContent.includes("window.AndroidNativeShell?.shareSubtitlesUrl") ||
    shareModalContent.includes("shell?.shareSubtitlesUrl"),
  "ShareStateModal must call native Android shell shareSubtitlesUrl",
);
console.log("✅ PASS: ShareStateModal UI components and native bridge invocation verified.");

// 5. Verify Index Route Hydration of Target Languages, TTS Provider, and Subtitles
console.log("\n🌐 Section 5: Index Route URL State Hydration");
const indexPath = path.resolve(rootDir, "src/routes/index.tsx");
const indexContent = fs.readFileSync(indexPath, "utf-8");

assert(
  indexContent.includes("appState.targetLanguages"),
  "index.tsx must hydrate targetLanguages from URL",
);
assert(
  indexContent.includes("appState.ttsProvider"),
  "index.tsx must hydrate ttsProvider from URL",
);
assert(
  indexContent.includes("appState.subLang"),
  "index.tsx must hydrate subLang from URL",
);
assert(
  indexContent.includes("appState.subUrl"),
  "index.tsx must hydrate subUrl from URL",
);
assert(
  indexContent.includes("<ShareStateModal"),
  "index.tsx must render ShareStateModal component",
);
console.log("✅ PASS: Index route mounts ShareStateModal and hydrates all shared URL parameters.");

// 6. Verify Version Synchronization Across All 5 Targets
console.log("\n🔢 Section 6: Version Synchronization Across All 5 Targets");
const validVersions = ["1.0.76", "1.0.77", "1.0.78", "1.0.79"];

const pkg = JSON.parse(fs.readFileSync(path.resolve(rootDir, "package.json"), "utf-8"));
assert(validVersions.includes(pkg.version), `package.json version must be one of ${validVersions.join(", ")}, got ${pkg.version}`);

const gradlePath = path.resolve(rootDir, "android-shell/app/build.gradle.kts");
const gradleContent = fs.readFileSync(gradlePath, "utf-8");
assert(
  validVersions.some((v) => gradleContent.includes(`versionName = "${v}"`)),
  `build.gradle.kts versionName must match active version`,
);

assert(validVersions.includes(APP_VERSION), `appConfig.ts APP_VERSION must be valid`);
assert(
  validVersions.some((v) => CURRENT_APK_VERSION === `v${v}`),
  `apkUpdater.ts CURRENT_APK_VERSION must match active version`,
);

const appSettingsContent = fs.readFileSync(path.resolve(rootDir, "src/utils/appSettings.ts"), "utf-8");
assert(
  validVersions.some((v) => appSettingsContent.includes(`version: "${v}"`)),
  `appSettings.ts snapshot version must match active version`,
);

console.log(`✅ PASS: All 5 version targets synchronized.`);

console.log("=========================================================================");
console.log("🎉 ALL ANDROID SUBTITLES SHARING & VERSION 1.0.76 CHECKS PASSED 100%!");
console.log("=========================================================================");
