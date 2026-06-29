export const TOOL_ID = "local-business-lead-scanner";
export const INPUT_SCHEMA_VERSION = "1.0.0";
export const REPORT_SCHEMA_VERSION = "1.0.0";

export const defaultScanOptions = Object.freeze({
  defaultPageCap: 10,
  hardPageCap: 25,
  requestTimeoutMs: 8000,
  userAgent: "MaxxedTechnicalSystems-LocalBusinessLeadScanner/1.0 (+https://techmaxxed.com)",
});

export const scoreWeights = Object.freeze({
  contactability: 25,
  napConsistency: 20,
  localSeoBasics: 20,
  trustReadiness: 15,
  conversionPaths: 10,
  technicalReadability: 10,
});

export const csvColumns = Object.freeze([
  "tool_id",
  "input_schema_version",
  "report_schema_version",
  "scanned_url",
  "overall_score",
  "contactability_score",
  "nap_consistency_score",
  "local_seo_score",
  "trust_readiness_score",
  "conversion_paths_score",
  "technical_readability_score",
  "emails",
  "phones",
  "best_contact_url",
  "missing_items",
  "warnings",
  "summary",
]);

export const skippedPathPatterns = Object.freeze([
  /\/wp-admin(?:\/|$)/i,
  /\/admin(?:\/|$)/i,
  /\/login(?:\/|$)/i,
  /\/logout(?:\/|$)/i,
  /\/account(?:\/|$)/i,
  /\/cart(?:\/|$)/i,
  /\/checkout(?:\/|$)/i,
  /\/my-account(?:\/|$)/i,
  /\/privacy(?:\/|$)/i,
  /\/terms(?:\/|$)/i,
]);

export const skippedExtensions = Object.freeze([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".zip",
  ".mp4",
  ".mov",
  ".mp3",
  ".css",
  ".js",
  ".ico",
  ".xml",
]);
