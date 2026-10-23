import assert from "node:assert";
import {
  createShareableLink,
  parseShareableUrlState,
  extractVideoIdFromSubtitlesUrl,
  extractLanguageFromSubtitlesUrl,
  DEMO_SITE_BASE_URL,
} from "../src/utils/urlStateManager";

console.log("=========================================================================");
console.log("🧪 Verifying Minimal Share URL Generation, Extraction & State Reproduction");
console.log("=========================================================================");

// Raw subtitles URL from user prompt
const userSubtitlesUrl =
  "https://www.youtube.com/api/timedtext?v=vBURridJXZ0&ei=9nfZaqiaA5fEhcIPxJ-qwAU&caps=asr&opi=112496729&xoaf=5&xowf=1&xospf=1&hl=iw&ip=0.0.0.0&ipbits=0&expire=1792662118&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cxoaf&signature=88C479F7211A4B7598C4EFA2801CC220DCC3BD82.744950D1C92041EA70B86119471BD6C4CAF0FEC4&key=yt8&kind=asr&lang=iw&fmt=json3&xorb=2&xobt=3&xovt=3&cbr=Chrome&cbrver=155.0.0.0&c=WEB_EMBEDDED_PLAYER&cver=2.20261020.08.00&cplayer=UNIPLAYER&cos=Windows&cosver=10.0&cplatform=DESKTOP";

// 1. Requirement 1.2: Video ID extraction from subtitles URL
console.log("\n🔍 Section 1: Video ID Extraction from Subtitles URL");
const extractedId = extractVideoIdFromSubtitlesUrl(userSubtitlesUrl);
assert.strictEqual(
  extractedId,
  "vBURridJXZ0",
  "extractVideoIdFromSubtitlesUrl must extract 'vBURridJXZ0' from timedtext URL",
);
console.log(`✅ Extracted video ID: ${extractedId}`);

// Language extraction from subtitles URL
const extractedLang = extractLanguageFromSubtitlesUrl(userSubtitlesUrl);
assert.strictEqual(
  extractedLang,
  "iw",
  "extractLanguageFromSubtitlesUrl must extract 'iw' from timedtext URL",
);
console.log(`✅ Extracted language: ${extractedLang}`);

// 2. Requirement 1.1, 1.2, 1.3: createShareableLink with minimal info
console.log("\n🔗 Section 2: Minimal Share Link Generation");

// Suppose user had video L2Ryrr6txwA active, but entered subtitles URL with v=vBURridJXZ0
const minimalLink = createShareableLink({
  videoId: "L2Ryrr6txwA", // active video was L2Ryrr6txwA
  subtitlesUrl: userSubtitlesUrl,
  minimal: true,
});

console.log("Generated minimal link:", minimalLink);

// 1.3: Base URL strictly https://mostuf2556.github.io/subtitle-sync
assert(
  minimalLink.startsWith(DEMO_SITE_BASE_URL),
  `Link must start strictly with ${DEMO_SITE_BASE_URL}`,
);

const urlObj = new URL(minimalLink);
const params = urlObj.searchParams;

// 1.2: Video ID extracted from 1.1 (the subtitles URL)
assert.strictEqual(
  params.get("v"),
  "vBURridJXZ0",
  "Video ID in shared link must be extracted from the subtitles URL query (vBURridJXZ0)",
);

// 1.1: Default subtitles URL encoded
assert.strictEqual(
  params.get("subtitles_url"),
  userSubtitlesUrl,
  "subtitles_url must equal the original user-entered timedtext URL",
);

// Minimal verification: MUST NOT contain bloated or duplicated keys
assert(!params.has("sub_url"), "Minimal link must not duplicate 'sub_url'");
assert(!params.has("source_lang_code"), "Minimal link must not contain redundant 'source_lang_code'");
assert(!params.has("sub_lang"), "Minimal link must not contain redundant 'sub_lang'");
assert(!params.has("Target_langs"), "Minimal link must not contain redundant 'Target_langs'");
assert(!params.has("target_langs"), "Minimal link must not contain redundant 'target_langs'");
assert(!params.has("target_lang"), "Minimal link must not contain redundant 'target_lang'");
assert(!params.has("tts_provider"), "Minimal link must not contain redundant 'tts_provider'");

console.log("✅ PASS: Generated link satisfies 1.1, 1.2, and 1.3 with minimal info and no duplicates");

// 3. Section 3: State Reproduction on Link Open
console.log("\n📥 Section 3: State Reproduction when Recipient Opens Minimal Link");

const hydratedState = parseShareableUrlState(urlObj.search);

assert.strictEqual(
  hydratedState.videoId,
  "vBURridJXZ0",
  "Recipient app state must resolve video ID 'vBURridJXZ0'",
);

assert.strictEqual(
  hydratedState.subtitlesUrl,
  userSubtitlesUrl,
  "Recipient app state must resolve subtitles URL",
);

assert.strictEqual(
  hydratedState.subLang,
  "iw",
  "Recipient app state must automatically infer source language 'iw' from subtitles URL",
);

console.log("✅ PASS: State reproduction successfully recreates videoId, subtitlesUrl, and subLang");

// 4. Section 4: Fixture URL Video ID and Language Extraction
console.log("\n📁 Section 4: Fixture URL Video ID and Language Extraction");
const fixtureUrl = "https://mostuf2556.github.io/subtitle-sync/fixtures/L2Ryrr6txwA/he.json";
assert.strictEqual(extractVideoIdFromSubtitlesUrl(fixtureUrl), "L2Ryrr6txwA");
assert.strictEqual(extractLanguageFromSubtitlesUrl(fixtureUrl), "he");

console.log("✅ PASS: Fixture URLs also correctly extract video ID and language code");

console.log("\n=========================================================================");
console.log("🎉 ALL TESTS PASSED! Task 185 Minimal URL Sharing is 100% verified!");
console.log("=========================================================================");
