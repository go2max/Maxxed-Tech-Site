import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildCrawlPlan, extractEmails, extractPhones, isAllowedPageUrl, normalizeUrl, parsePage, scanWebsite } from "../scanner.mjs";
import { buildLeadScannerReport, toCsv } from "../report.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = (name) => readFile(join(root, "fixtures", name), "utf8");

describe("Local Business Lead Scanner extraction", () => {
  it("normalizes website URLs safely", () => {
    assert.equal(normalizeUrl("example.com"), "https://example.com/");
    assert.equal(normalizeUrl("http://example.com/path#section"), "http://example.com/path");
    assert.throws(() => normalizeUrl("mailto:test@example.com"), /Only http and https/);
  });

  it("blocks off-origin, admin, checkout, and binary URLs", () => {
    const origin = "https://example.com";
    assert.equal(isAllowedPageUrl("https://example.com/contact", origin), true);
    assert.equal(isAllowedPageUrl("https://example.com/wp-admin/edit.php", origin), false);
    assert.equal(isAllowedPageUrl("https://example.com/checkout", origin), false);
    assert.equal(isAllowedPageUrl("https://example.com/file.pdf", origin), false);
    assert.equal(isAllowedPageUrl("https://other.example/contact", origin), false);
  });

  it("extracts visible email and phone candidates", async () => {
    const html = await fixture("strong-local-business.html");
    assert.deepEqual(extractEmails(html), ["hello@example.com"]);
    assert.deepEqual(extractPhones(html), ["(916) 555-1212"]);
  });

  it("extracts common human-readable obfuscated email candidates", async () => {
    const html = await fixture("obfuscated-contact.html");
    assert.deepEqual(extractEmails(html), ["hello@capitalvalleyservice.com", "billing@capitalvalleyservice.com"]);
  });

  it("parses contact, social, metadata, schema, and CTA signals", async () => {
    const page = parsePage("https://example.com/", await fixture("strong-local-business.html"));
    assert.equal(page.meta.title, "Roseville Mobile Notary | A. Bunch Mobile Notary");
    assert.equal(page.meta.description.includes("Mobile notary"), true);
    assert.equal(page.signals.hasForm, true);
    assert.equal(page.signals.hasHours, true);
    assert.equal(page.signals.contactLinks[0].url, "https://example.com/contact");
    assert.equal(page.signals.socialLinks[0].url, "https://www.facebook.com/example");
    assert.equal(page.jsonLd.length, 1);
  });
});

describe("Local Business Lead Scanner reporting", () => {
  it("scores strong local business pages higher than weak pages", async () => {
    const strong = parsePage("https://example.com/", await fixture("strong-local-business.html"));
    const weak = parsePage("https://weak.example/", await fixture("weak-contact.html"));

    const strongReport = buildLeadScannerReport({ seedUrl: "https://example.com/", origin: "https://example.com", pages: [strong], errors: [] });
    const weakReport = buildLeadScannerReport({ seedUrl: "https://weak.example/", origin: "https://weak.example", pages: [weak], errors: [] });

    assert.equal(strongReport.overallScore > weakReport.overallScore, true);
    assert.equal(strongReport.found.emails.includes("hello@example.com"), true);
    assert.equal(weakReport.missing.includes("visible email"), true);
    assert.equal(weakReport.missing.includes("visible phone number"), true);
  });

  it("flags expected NAP mismatches", async () => {
    const page = parsePage("https://repair.example/", await fixture("nap-mismatch.html"));
    const report = buildLeadScannerReport(
      { seedUrl: "https://repair.example/", origin: "https://repair.example", pages: [page], errors: [] },
      { businessName: "Capital City Repair", phone: "916-555-1212", email: "hello@repair.example", cityStateOrServiceArea: "Sacramento" },
    );

    assert.equal(report.warnings.some((warning) => warning.includes("Expected phone")), true);
    assert.equal(report.warnings.some((warning) => warning.includes("Expected email")), false, "no visible email means no email mismatch warning should be emitted");
  });

  it("exports the documented CSV row shape", async () => {
    const page = parsePage("https://example.com/", await fixture("strong-local-business.html"));
    const report = buildLeadScannerReport({ seedUrl: "https://example.com/", origin: "https://example.com", pages: [page], errors: [] });
    const csv = toCsv(report);
    assert.equal(csv.startsWith("tool_id,input_schema_version,report_schema_version,scanned_url"), true);
    assert.equal(csv.includes("local-business-lead-scanner"), true);
    assert.equal(csv.includes("hello@example.com"), true);
  });
});

describe("Local Business Lead Scanner crawl planning", () => {
  it("keeps crawl plans same-origin and capped", async () => {
    const html = `<a href="/contact">Contact</a><a href="/wp-admin/edit.php">Admin</a><a href="https://other.example/">Other</a><a href="/quote">Quote</a>`;
    const page = parsePage("https://example.com/", html);
    assert.deepEqual(buildCrawlPlan("example.com", [page], { pageCap: 2 }), ["https://example.com/", "https://example.com/contact"]);
  });

  it("uses an injected fetch layer for deterministic scans", async () => {
    const pages = new Map([
      ["https://example.com/", `<a href="/contact">Contact</a>`],
      ["https://example.com/contact", `Call (916) 555-1212`],
    ]);
    const scan = await scanWebsite("example.com", { fetchPage: async (url) => pages.get(url) || "", pageCap: 5 });
    assert.equal(scan.pages.length, 2);
    assert.deepEqual(scan.pages[1].phones, ["(916) 555-1212"]);
  });
});
