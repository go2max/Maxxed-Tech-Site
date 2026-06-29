import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateAudit, cloneDefaultAudit, generateReport, getScoreBand, SECTION_WEIGHTS } from "../src/scoring.mjs";

const empty = calculateAudit(cloneDefaultAudit());
assert.equal(empty.score < 30, true, "empty audit should score as high-priority cleanup");
assert.equal(empty.band, "High-priority cleanup");
assert.equal(empty.recommendations.some((item) => item.priority === "High"), true, "empty audit should include high-priority recommendations");

const perfectAudit = cloneDefaultAudit();
perfectAudit.businessName = "Complete Business";
perfectAudit.primaryCategory = "Primary Service";
perfectAudit.secondaryCategories = "Relevant secondary service";
perfectAudit.websiteUrl = "https://example.com";
perfectAudit.phone = "916-555-0100";
perfectAudit.addressOrServiceArea = "Sacramento, CA";
perfectAudit.hoursPresent = true;
perfectAudit.appointmentUrlPresent = true;
for (const [section, fields] of Object.entries(perfectAudit)) {
  if (!section.includes("Profile") && typeof fields !== "object") continue;
}
for (const section of Object.keys(SECTION_WEIGHTS)) {
  if (typeof perfectAudit[section] !== "object") continue;
  for (const key of Object.keys(perfectAudit[section])) perfectAudit[section][key] = true;
}
perfectAudit.categoryFit.noCategoryStuffing = true;
const perfect = calculateAudit(perfectAudit);
assert.equal(perfect.score, 100, "complete audit should score 100");
assert.equal(perfect.band, "Strong");
assert.equal(perfect.recommendations.length, 0, "complete audit should have no open recommendations");

const sample = JSON.parse(await readFile(new URL("../fixtures/sample-audit.json", import.meta.url), "utf8"));
const calculated = calculateAudit(sample);
assert.equal(calculated.score >= 50, true, "sample audit should be usable and above cleanup threshold");
assert.equal(calculated.recommendations.some((item) => item.id === "reviews.hasRecentReviews"), true, "sample should flag recent reviews");
assert.equal(calculated.recommendations.find((item) => item.id === "reviews.hasRecentReviews").status, "In Progress", "saved task status should be retained");

const report = generateReport(sample, calculated, new Date("2026-06-29T12:00:00Z"));
assert.match(report, /GBP Audit Tracker Report/);
assert.match(report, /A\. Bunch Mobile Notary/);
assert.match(report, /Overall score:/);
assert.match(report, /Disclaimer:/);
assert.match(report, /not affiliated with Google/i);

assert.equal(getScoreBand(90), "Strong");
assert.equal(getScoreBand(75), "Good but improvable");
assert.equal(getScoreBand(50), "Needs work");
assert.equal(getScoreBand(49), "High-priority cleanup");

console.log("GBP Audit Tracker scoring tests passed.");
