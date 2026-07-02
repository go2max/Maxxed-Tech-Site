import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const requiredScripts = [
  "scripts/build-public-site.mjs",
  "scripts/build.mjs",
  "scripts/apply-public-redesign.mjs",
  "scripts/apply-homepage-presence-redesign.mjs",
  "scripts/apply-sectioned-catalog-redesign.mjs",
  "scripts/apply-product-page-conversion-redesign.mjs",
  "scripts/apply-order-about-polish.mjs",
  "scripts/apply-support-mobile-polish.mjs",
  "scripts/apply-conversion-flow-polish.mjs",
  "scripts/apply-visual-consistency-polish.mjs",
  "scripts/public-redesign-utils.mjs",
  "scripts/validate-site.mjs",
  "scripts/validate-artifact.mjs",
  "scripts/validate-public-redesign-chain.mjs",
];

const expectedRedesignPasses = [
  "./apply-homepage-presence-redesign.mjs",
  "./apply-sectioned-catalog-redesign.mjs",
  "./apply-product-page-conversion-redesign.mjs",
  "./apply-order-about-polish.mjs",
  "./apply-support-mobile-polish.mjs",
  "./apply-conversion-flow-polish.mjs",
  "./apply-visual-consistency-polish.mjs",
];

const buildCommand = packageJson.scripts?.build || "";
assert.equal(buildCommand, "node scripts/build-public-site.mjs", "package build should use the consolidated public build wrapper");
assert.match(packageJson.scripts?.["check:public"] || "", /npm run build && npm run validate/, "check:public should build before validating");

for (const path of requiredScripts) {
  await access(resolve(root, path));
}

const buildWrapper = await readFile(resolve(root, "scripts/build-public-site.mjs"), "utf8");
assert.match(buildWrapper, /await import\("\.\/build\.mjs"\)/, "Build wrapper should run the base generator");
assert.match(buildWrapper, /await import\("\.\/apply-public-redesign\.mjs"\)/, "Build wrapper should run the public redesign orchestrator");
assert.match(buildWrapper, /await cp\(siteDir, publicDir, \{ recursive: true \}\)/, "Build wrapper should copy generated site output into public");

const orchestrator = await readFile(resolve(root, "scripts/apply-public-redesign.mjs"), "utf8");
let previousIndex = -1;
for (const pass of expectedRedesignPasses) {
  const index = orchestrator.indexOf(pass);
  assert.ok(index >= 0, `Public redesign orchestrator is missing pass: ${pass}`);
  assert.ok(index > previousIndex, `Public redesign pass is out of order: ${pass}`);
  previousIndex = index;
}

const validation = await readFile(resolve(root, "scripts/validate-site.mjs"), "utf8");
for (const lockedPhrase of [
  "Android apps by product lane",
  "WordPress plugins by workflow lane",
  "Software tools and product concepts",
  "Order a custom app, plugin, automation, or workflow tool",
  "Independent software built by Max Uland",
  "Get help, request testing, or ask about a build",
  "Not every visitor should go to checkout",
  "Make sure this is the right lane",
]) {
  assert.match(validation, new RegExp(lockedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `validate-site should lock redesigned copy: ${lockedPhrase}`);
}

console.log("Validated public build wrapper and redesign orchestrator.");
