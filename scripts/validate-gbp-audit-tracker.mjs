import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "content/tool-products.mjs",
  "tools/gbp-audit-tracker/index.html",
  "tools/gbp-audit-tracker/styles.css",
  "tools/gbp-audit-tracker/src/app.mjs",
  "tools/gbp-audit-tracker/src/scoring.mjs",
  "tools/gbp-audit-tracker/fixtures/sample-audit.json",
  "tools/gbp-audit-tracker/tests/scoring.test.mjs",
  "tools/gbp-audit-tracker/README.md",
  "public/tools/gbp-audit-tracker/app/index.html",
  "docs/GBP_AUDIT_TRACKER_READINESS.md",
];

for (const file of requiredFiles) await access(file);

const toolProducts = await readFile("content/tool-products.mjs", "utf8");
const build = await readFile("scripts/build.mjs", "utf8");
const html = await readFile("tools/gbp-audit-tracker/index.html", "utf8");
const publicAppHtml = await readFile("public/tools/gbp-audit-tracker/app/index.html", "utf8");
const app = await readFile("tools/gbp-audit-tracker/src/app.mjs", "utf8");
const scoring = await readFile("tools/gbp-audit-tracker/src/scoring.mjs", "utf8");
const readme = await readFile("tools/gbp-audit-tracker/README.md", "utf8");
const readiness = await readFile("docs/GBP_AUDIT_TRACKER_READINESS.md", "utf8");

assert.match(toolProducts, /gbp-audit-tracker/);
assert.match(toolProducts, /appRoute/);
assert.match(toolProducts, /Browser local/);
assert.match(toolProducts, /No API keys/);

assert.match(build, /toolProducts/);
assert.match(build, /function toolPage/);
assert.match(build, /Browser tools/);
assert.match(build, /toolProducts\.map\(\(tool\) => tool\.route\)/);
assert.match(build, /Open tool/);

assert.match(html, /data-audit-form/);
assert.match(html, /data-score-value/);
assert.match(html, /data-recommendations/);
assert.match(html, /data-saved-audits/);
assert.match(html, /data-copy-report/);
assert.match(html, /data-download-report/);
assert.match(html, /support@techmaxxed\.com/);
assert.match(html, /not affiliated with Google/i);

assert.match(publicAppHtml, /GBP Audit Tracker/);
assert.match(publicAppHtml, /support@techmaxxed\.com/);
assert.match(publicAppHtml, /localStorage/);
assert.match(publicAppHtml, /Copy report/);
assert.match(publicAppHtml, /Download Markdown/);
assert.match(publicAppHtml, /not affiliated with Google/i);
assert.match(publicAppHtml, /index,follow/);

assert.match(app, /localStorage/);
assert.match(app, /saveAudit/);
assert.match(app, /downloadReport/);
assert.match(app, /copyReport/);
assert.match(app, /data-task-status/);

for (const section of [
  "coreProfile",
  "categoryFit",
  "servicesProducts",
  "reviews",
  "photosMedia",
  "postsUpdates",
  "qna",
  "websiteAlignment",
  "napConsistency",
  "conversionReadiness",
]) {
  assert.match(scoring, new RegExp(section), `${section} should be represented in scoring`);
}

assert.match(scoring, /generateReport/);
assert.match(scoring, /SECTION_WEIGHTS/);
assert.match(readme, /Run/);
assert.match(readme, /Product copy/);
assert.match(readiness, /Acceptance gate/);
assert.match(readiness, /Out of scope/);
assert.match(readiness, /first-class/i);

console.log("GBP Audit Tracker validation passed.");
