import { csvColumns, INPUT_SCHEMA_VERSION, REPORT_SCHEMA_VERSION, scoreWeights, TOOL_ID } from "./schema.mjs";

const unique = (items) => [...new Set(items.filter(Boolean))];
const flatten = (items) => items.flatMap((item) => Array.isArray(item) ? flatten(item) : [item]);
const clamp = (value, max) => Math.max(0, Math.min(max, value));

function collectJsonLdValues(block, keys = []) {
  if (!block || typeof block !== "object") return [];
  const values = [];
  for (const [key, value] of Object.entries(block)) {
    if (keys.includes(key)) values.push(value);
    if (Array.isArray(value)) values.push(...value.flatMap((item) => collectJsonLdValues(item, keys)));
    else if (value && typeof value === "object") values.push(...collectJsonLdValues(value, keys));
  }
  return flatten(values).map((value) => typeof value === "string" ? value : JSON.stringify(value));
}

function normalizeExpected(expected = {}) {
  return {
    businessName: expected.businessName?.trim() || "",
    phone: expected.phone?.trim() || "",
    email: expected.email?.trim().toLowerCase() || "",
    cityStateOrServiceArea: expected.cityStateOrServiceArea?.trim() || "",
    notes: expected.notes?.trim() || "",
  };
}

function pageHasNoIndex(page) {
  return /noindex/.test(page.meta?.robots || "");
}

export function scoreLeadReadiness(scan, expected = {}) {
  const normalizedExpected = normalizeExpected(expected);
  const pages = scan.pages || [];
  const allEmails = unique(pages.flatMap((page) => page.emails || []));
  const allPhones = unique(pages.flatMap((page) => page.phones || []));
  const allContactLinks = unique(pages.flatMap((page) => page.signals?.contactLinks?.map((link) => link.url) || []));
  const allSocialLinks = unique(pages.flatMap((page) => page.signals?.socialLinks?.map((link) => link.url) || []));
  const ctas = unique(pages.flatMap((page) => page.signals?.ctas || []));
  const hasForm = pages.some((page) => page.signals?.hasForm);
  const hasHours = pages.some((page) => page.signals?.hasHours);
  const hasAddressCue = pages.some((page) => page.signals?.hasAddressCue);
  const hasMapEmbed = pages.some((page) => page.signals?.hasMapEmbed);
  const hasLocalBusinessLanguage = pages.some((page) => page.signals?.hasLocalBusinessLanguage);
  const jsonLd = pages.flatMap((page) => page.jsonLd || []);
  const jsonLdTypes = unique(collectJsonLdValues(jsonLd, ["@type"]));
  const hasLocalBusinessSchema = jsonLdTypes.some((type) => /LocalBusiness|Organization|ProfessionalService|Store|Restaurant|HomeAndConstructionBusiness/i.test(type));
  const pageTitles = pages.map((page) => page.meta?.title).filter(Boolean);
  const metaDescriptions = pages.map((page) => page.meta?.description).filter(Boolean);
  const noIndexPages = pages.filter(pageHasNoIndex).map((page) => page.url);

  const missing = [];
  const warnings = [];
  const improvements = [];

  if (!allEmails.length) missing.push("visible email");
  if (!allPhones.length) missing.push("visible phone number");
  if (!allContactLinks.length && !hasForm) missing.push("clear contact page or form");
  if (!hasAddressCue && !hasMapEmbed) missing.push("visible address or service-area location cues");
  if (!hasHours) missing.push("business hours");
  if (!hasLocalBusinessSchema) improvements.push("Add or repair LocalBusiness/Organization structured data.");
  if (!metaDescriptions.length) improvements.push("Add useful meta descriptions to important pages.");
  if (!ctas.length) improvements.push("Add stronger calls to action such as call, quote, book, schedule, or contact.");
  if (!allSocialLinks.length) improvements.push("Add reviewable social/profile links where relevant.");
  if (scan.errors?.length) warnings.push(`${scan.errors.length} page(s) could not be fetched in the scan.`);
  if (noIndexPages.length) warnings.push(`${noIndexPages.length} scanned page(s) included noindex robots signals.`);

  if (normalizedExpected.email && allEmails.length && !allEmails.includes(normalizedExpected.email)) warnings.push("Expected email was not found in visible page content.");
  if (normalizedExpected.phone && allPhones.length && !allPhones.some((phone) => phone.replace(/\D/g, "").endsWith(normalizedExpected.phone.replace(/\D/g, "").slice(-10)))) warnings.push("Expected phone was not found in visible page content.");
  if (normalizedExpected.businessName && !pages.some((page) => page.text?.toLowerCase().includes(normalizedExpected.businessName.toLowerCase()))) warnings.push("Expected business name was not found in visible page text.");
  if (normalizedExpected.cityStateOrServiceArea && !pages.some((page) => page.text?.toLowerCase().includes(normalizedExpected.cityStateOrServiceArea.toLowerCase()))) warnings.push("Expected city/state/service area was not found in visible page text.");

  const componentScores = {
    contactability: clamp((allPhones.length ? 8 : 0) + (allEmails.length ? 6 : 0) + (allContactLinks.length ? 5 : 0) + (hasForm ? 4 : 0) + (ctas.length ? 2 : 0), scoreWeights.contactability),
    napConsistency: clamp((normalizedExpected.businessName ? 4 : 2) + (allPhones.length ? 6 : 0) + ((hasAddressCue || hasMapEmbed) ? 6 : 0) + (warnings.some((warning) => /Expected/.test(warning)) ? 0 : 4), scoreWeights.napConsistency),
    localSeoBasics: clamp((hasLocalBusinessSchema ? 7 : 0) + (hasLocalBusinessLanguage ? 4 : 0) + (hasHours ? 3 : 0) + (metaDescriptions.length ? 3 : 0) + (pageTitles.length ? 3 : 0), scoreWeights.localSeoBasics),
    trustReadiness: clamp((hasHours ? 4 : 0) + (allSocialLinks.length ? 3 : 0) + ((hasAddressCue || hasMapEmbed) ? 4 : 0) + (hasLocalBusinessLanguage ? 2 : 0) + (pages.length > 1 ? 2 : 0), scoreWeights.trustReadiness),
    conversionPaths: clamp((ctas.length ? 4 : 0) + (hasForm ? 3 : 0) + (allContactLinks.length ? 3 : 0), scoreWeights.conversionPaths),
    technicalReadability: clamp((pages.length ? 4 : 0) + (scan.errors?.length ? 0 : 3) + (noIndexPages.length ? 0 : 3), scoreWeights.technicalReadability),
  };

  const overallScore = Object.values(componentScores).reduce((sum, value) => sum + value, 0);
  return {
    overallScore,
    componentScores,
    missing,
    warnings,
    improvements,
    found: {
      emails: allEmails,
      phones: allPhones,
      contactUrls: allContactLinks,
      socialUrls: allSocialLinks,
      ctas,
      hasForm,
      hasHours,
      hasAddressCue,
      hasMapEmbed,
      hasLocalBusinessSchema,
      jsonLdTypes,
    },
    noIndexPages,
  };
}

export function summarizeReport(report) {
  const bestContact = report.bestContactUrl ? ` Best contact path: ${report.bestContactUrl}.` : " No strong contact path was found.";
  const missing = report.missing.length ? ` Missing or weak: ${report.missing.join(", ")}.` : " Core lead-readiness signals are present.";
  const warnings = report.warnings.length ? ` Warnings: ${report.warnings.join(" ")}` : "";
  return `${report.scannedUrl} scored ${report.overallScore}/100 for local lead readiness.${bestContact}${missing}${warnings}`;
}

export function buildLeadScannerReport(scan, expected = {}) {
  const scoring = scoreLeadReadiness(scan, expected);
  const report = {
    toolId: TOOL_ID,
    inputSchemaVersion: INPUT_SCHEMA_VERSION,
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    scannedUrl: scan.seedUrl,
    scannedOrigin: scan.origin,
    pageCount: scan.pages?.length || 0,
    scannedPages: (scan.pages || []).map((page) => page.url),
    overallScore: scoring.overallScore,
    componentScores: scoring.componentScores,
    found: scoring.found,
    missing: scoring.missing,
    warnings: scoring.warnings,
    improvements: scoring.improvements,
    bestContactUrl: scoring.found.contactUrls[0] || "",
    crawlErrors: scan.errors || [],
    generatedAt: new Date(0).toISOString(),
  };
  return { ...report, summary: summarizeReport(report) };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvRow(report) {
  const row = {
    tool_id: report.toolId,
    input_schema_version: report.inputSchemaVersion,
    report_schema_version: report.reportSchemaVersion,
    scanned_url: report.scannedUrl,
    overall_score: report.overallScore,
    contactability_score: report.componentScores.contactability,
    nap_consistency_score: report.componentScores.napConsistency,
    local_seo_score: report.componentScores.localSeoBasics,
    trust_readiness_score: report.componentScores.trustReadiness,
    conversion_paths_score: report.componentScores.conversionPaths,
    technical_readability_score: report.componentScores.technicalReadability,
    emails: report.found.emails,
    phones: report.found.phones,
    best_contact_url: report.bestContactUrl,
    missing_items: report.missing,
    warnings: report.warnings,
    summary: report.summary,
  };
  return csvColumns.map((column) => csvEscape(row[column])).join(",");
}

export function toCsv(report) {
  return `${csvColumns.join(",")}\n${toCsvRow(report)}\n`;
}
