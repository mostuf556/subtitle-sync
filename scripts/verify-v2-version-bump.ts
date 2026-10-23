import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { APP_VERSION, APP_VERSION_DESCRIPTION } from "../src/config/appConfig";
import { CURRENT_APK_VERSION } from "../src/utils/apkUpdater";

console.log("=========================================================================");
console.log("🧪 Verifying Major APK Version Bump to 2.*.* Across All 5 Targets");
console.log("=========================================================================");

const rootDir = process.cwd();
const expectedVersion = "2.0.0";
const expectedVersionCode = 20000;

// Section 1: Major version pattern verification
console.log("\n🔢 Section 1: Major Version 2.*.* Pattern Compliance");
assert(
  /^2\.\d+\.\d+$/.test(expectedVersion),
  `Expected version ${expectedVersion} must match major version pattern 2.*.*`,
);
console.log(`✅ Version ${expectedVersion} conforms to 2.*.* requirement`);

// Section 2: Target 1 - package.json
console.log("\n📦 Section 2: Target 1 - package.json");
const pkgPath = path.resolve(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert.strictEqual(
  pkg.version,
  expectedVersion,
  `package.json version must be ${expectedVersion}, got ${pkg.version}`,
);
assert(
  pkg.version.startsWith("2."),
  `package.json version must start with 2., got ${pkg.version}`,
);
console.log(`✅ Target 1: package.json version = ${pkg.version}`);

// Section 3: Target 2 - android-shell/app/build.gradle.kts
console.log("\n🤖 Section 3: Target 2 - android-shell/app/build.gradle.kts");
const gradlePath = path.resolve(rootDir, "android-shell/app/build.gradle.kts");
const gradleContent = fs.readFileSync(gradlePath, "utf-8");

assert(
  gradleContent.includes(`versionName = "${expectedVersion}"`),
  `build.gradle.kts must contain versionName = "${expectedVersion}"`,
);
assert(
  gradleContent.includes(`versionCode = ${expectedVersionCode}`),
  `build.gradle.kts must contain versionCode = ${expectedVersionCode}`,
);
console.log(
  `✅ Target 2: build.gradle.kts versionName = "${expectedVersion}", versionCode = ${expectedVersionCode}`,
);

// Section 4: Target 3 - src/config/appConfig.ts
console.log("\n⚙️ Section 4: Target 3 - src/config/appConfig.ts");
assert.strictEqual(
  APP_VERSION,
  expectedVersion,
  `appConfig.ts APP_VERSION must be ${expectedVersion}, got ${APP_VERSION}`,
);
assert(
  APP_VERSION.startsWith("2."),
  `appConfig.ts APP_VERSION must start with 2., got ${APP_VERSION}`,
);
console.log(`✅ Target 3: src/config/appConfig.ts APP_VERSION = ${APP_VERSION}`);
console.log(`   Version Description: ${APP_VERSION_DESCRIPTION}`);

// Section 5: Target 4 - src/utils/apkUpdater.ts
console.log("\n📱 Section 5: Target 4 - src/utils/apkUpdater.ts");
assert.strictEqual(
  CURRENT_APK_VERSION,
  `v${expectedVersion}`,
  `apkUpdater.ts CURRENT_APK_VERSION must be v${expectedVersion}, got ${CURRENT_APK_VERSION}`,
);
assert(
  CURRENT_APK_VERSION.startsWith("v2."),
  `apkUpdater.ts CURRENT_APK_VERSION must start with v2., got ${CURRENT_APK_VERSION}`,
);
console.log(`✅ Target 4: src/utils/apkUpdater.ts CURRENT_APK_VERSION = ${CURRENT_APK_VERSION}`);

// Section 6: Target 5 - src/utils/appSettings.ts
console.log("\n💾 Section 6: Target 5 - src/utils/appSettings.ts");
const appSettingsPath = path.resolve(rootDir, "src/utils/appSettings.ts");
const appSettingsContent = fs.readFileSync(appSettingsPath, "utf-8");
assert(
  appSettingsContent.includes(`version: "${expectedVersion}"`),
  `appSettings.ts exportFullAppState snapshot must have version: "${expectedVersion}"`,
);
console.log(`✅ Target 5: src/utils/appSettings.ts snapshot version = "${expectedVersion}"`);

console.log("\n=========================================================================");
console.log("🎉 ALL CHECKS PASSED: APK Version 2.0.0 bumped and synchronized across all 5 targets!");
console.log("=========================================================================");
