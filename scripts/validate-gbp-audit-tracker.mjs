import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "tools/gbp-audit-tracker/index.html",
  "tools/gbp-audit-tracker/styles.css",
  "tools/gbp-audit-tracker/src/app.mjs",
  "tools/gbp-audit-tracker/src/scoring.mjs",
  "tools/gbp-audit-tracker/fixtures/sample-audit.json",
  "tools/gbp-audit-tracker/tests/scoring.test.mjs",
  "tools/gbp-audit-tracker/README.md",
  "docs/GBP_AUDIT_TRACKER_READINESS.md",
];

for (const file of requiredFiles) await access(file);

const html = await readFile("tools/gbp-audit-tracker/index.html", "utf8");
const app = await readFile("tools/gbp-audit-tracker/src/app.mjs", "utf8");
const scoring = await readFile("tools/gbp-audit-tracker/src/scoring.mjs", "utf8");
const readme = await readFile("tools/gbp-audit-tracker/README.md", "utf8");
const readiness = await readFile("docs/GBP_AUDIT_TRACKER_READINESS.md", "utf8");

assert.match(html, /data-audit-form/);
assert.match(html, /data-score-value/);
assert.match(html, /data-recommendations/);
assert.match(html, /data-saved-audits/);
assert.match(html, /data-copy-report/);
assert.match(html, /data-download-report/);
assert.match(html, /support@techmaxxed\.com/);
assert.match(html, /not affiliated with Google/i);

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

console.log("GBP Audit Tracker validation passed.");
