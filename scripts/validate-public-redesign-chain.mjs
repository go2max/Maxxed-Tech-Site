import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const expectedBuildSteps = [
  "node scripts/build.mjs",
  "node scripts/apply-homepage-presence-redesign.mjs",
  "node scripts/apply-sectioned-catalog-redesign.mjs",
  "node scripts/apply-product-page-conversion-redesign.mjs",
  "node scripts/apply-order-about-polish.mjs",
  "node scripts/apply-support-mobile-polish.mjs",
  "rm -rf public && cp -R site public",
];

const requiredScripts = [
  "scripts/build.mjs",
  "scripts/apply-homepage-presence-redesign.mjs",
  "scripts/apply-sectioned-catalog-redesign.mjs",
  "scripts/apply-product-page-conversion-redesign.mjs",
  "scripts/apply-order-about-polish.mjs",
  "scripts/apply-support-mobile-polish.mjs",
  "scripts/validate-site.mjs",
  "scripts/validate-artifact.mjs",
  "scripts/validate-public-redesign-chain.mjs",
];

const buildCommand = packageJson.scripts?.build || "";
assert.ok(buildCommand, "package.json must define a build script");

let previousIndex = -1;
for (const step of expectedBuildSteps) {
  const index = buildCommand.indexOf(step);
  assert.ok(index >= 0, `Build command is missing expected step: ${step}`);
  assert.ok(index > previousIndex, `Build step is out of order: ${step}`);
  previousIndex = index;
}

assert.match(buildCommand, /find public -mindepth 1/, "Build should clear generated public files before export");
assert.doesNotMatch(buildCommand, /node scripts\/apply-support-mobile-polish\.mjs[\s\S]*node scripts\/build\.mjs/, "Post-build scripts must not run before the generator");
assert.match(packageJson.scripts?.["check:public"] || "", /npm run build && npm run validate/, "check:public should build before validating");

for (const path of requiredScripts) {
  await access(resolve(root, path));
}

const validation = await readFile(resolve(root, "scripts/validate-site.mjs"), "utf8");
for (const lockedPhrase of [
  "Android apps by product lane",
  "WordPress plugins by workflow lane",
  "Software tools and product concepts",
  "Order a custom app, plugin, automation, or workflow tool",
  "Independent software built by Max Uland",
  "Get help, request testing, or ask about a build",
]) {
  assert.match(validation, new RegExp(lockedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `validate-site should lock redesigned copy: ${lockedPhrase}`);
}

console.log("Validated public redesign build-chain order and required scripts.");
