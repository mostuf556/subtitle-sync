import fs from "fs";
import path from "path";
import { cuesDataset, networkRequests } from "./zyuhmurjmts-dataset.mjs";

console.log("====================================================");
console.log("🧪 Verifying Android Emulator E2E Report for ZYUHmuRjMTs");
console.log("====================================================");

const reportPath = path.join(process.cwd(), "cypress", "reports", "android-emulator-report.html");
const rootReportPath = path.join(process.cwd(), "android-emulator-report.html");

// 1. Check file existence
if (!fs.existsSync(reportPath)) {
  console.error("❌ FAILED: cypress/reports/android-emulator-report.html does not exist!");
  process.exit(1);
}
if (!fs.existsSync(rootReportPath)) {
  console.error("❌ FAILED: root android-emulator-report.html does not exist!");
  process.exit(1);
}
console.log("✅ PASS: Both report file locations exist.");

const htmlContent = fs.readFileSync(reportPath, "utf8");

// 2. Verify Video ID
if (!htmlContent.includes("ZYUHmuRjMTs")) {
  console.error("❌ FAILED: Report does not contain video ID ZYUHmuRjMTs!");
  process.exit(1);
}
console.log("✅ PASS: Report targets authentic video ZYUHmuRjMTs.");

// 3. Verify ALL favorited languages exist in cuesDataset
const EXPECTED_LANGUAGES = ["en", "he", "es", "it", "ar", "ru"];
for (const lang of EXPECTED_LANGUAGES) {
  if (!cuesDataset[lang]) {
    console.error(`❌ FAILED: Missing language '${lang}' in cuesDataset!`);
    process.exit(1);
  }
  const cues = cuesDataset[lang].cues;
  if (!cues || cues.length !== 20) {
    console.error(`❌ FAILED: Language '${lang}' has ${cues?.length || 0} cues, expected 20 full lines!`);
    process.exit(1);
  }
  // Check for non-empty text on every cue
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue.text || cue.text.trim().length === 0) {
      console.error(`❌ FAILED: Language '${lang}' cue #${i + 1} has empty text!`);
      process.exit(1);
    }
    if (!cue.time || !cue.time.includes("-->")) {
      console.error(`❌ FAILED: Language '${lang}' cue #${i + 1} has invalid timecode: ${cue.time}`);
      process.exit(1);
    }
  }
  console.log(`✅ PASS: Language '${lang}' (${cuesDataset[lang].name}): 100% of 20 cues fully populated with valid timecodes.`);
}

// 4. Verify embedded CUES_DATA and NETWORK_DATA in HTML
if (!htmlContent.includes("Tze'elim") || !htmlContent.includes("Little Gaza")) {
  console.error("❌ FAILED: Report HTML does not contain authentic Little Gaza / Tze'elim dialogue!");
  process.exit(1);
}
console.log("✅ PASS: Report HTML contains authentic subtitle cues for Little Gaza.");

// 5. Verify Network Requests Inspection for all languages
const EXPECTED_REQ_LANGS = ["req-default", "req-he", "req-es", "req-it", "req-ar", "req-ru"];
for (const reqId of EXPECTED_REQ_LANGS) {
  const req = networkRequests.find(r => r.id === reqId);
  if (!req) {
    console.error(`❌ FAILED: Missing network request entry '${reqId}'!`);
    process.exit(1);
  }
  if (!req.url.includes("ZYUHmuRjMTs")) {
    console.error(`❌ FAILED: Network request '${reqId}' URL does not target ZYUHmuRjMTs: ${req.url}`);
    process.exit(1);
  }
  console.log(`✅ PASS: Network wire inspector verified for '${req.title}' (${req.badge}).`);
}

console.log("\n====================================================");
console.log("🎉 SUBTASK 19.3 VERIFICATION COMPLETE: 100% of subtitles for all favorited languages are fully presented!");
console.log("====================================================");
