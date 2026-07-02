import { apps as testingApps } from "./catalog.js";

const upcoming = [
  item("broken-link-capture", "Broken Link Capture", "web-tool", "repo-exists", "Website QA"),
  item("business-letter-builder", "Business Letter Builder", "web-tool", "repo-exists", "Documents"),
  item("community-survey-builder", "Community Survey Builder", "web-tool", "repo-exists", "Community"),
  item("local-seo-page-checker", "Local SEO Page Checker", "web-tool", "repo-exists", "SEO"),
  item("simple-proposal-builder", "Simple Proposal Builder", "web-tool", "repo-exists", "Business"),
  item("subscription-cost-analyzer", "Subscription Cost Analyzer", "web-tool", "repo-exists", "Finance"),
  item("template-variable-manager", "Template Variable Manager", "web-tool", "repo-exists", "Documents"),
  item("website-contact-extractor", "Website Contact Extractor", "browser-tool", "repo-exists", "Sales"),
  item("page-metadata-inspector", "Page Metadata Inspector", "browser-tool", "repo-exists", "SEO"),
  item("form-field-tester", "Form Field Tester", "browser-tool", "repo-exists", "Website QA"),
  item("wordpress-role-auditor", "WordPress Role Auditor", "wordpress-plugin", "catalog-only", "Security"),
  item("security-header-audit", "Security Header Audit", "wordpress-plugin", "catalog-only", "Security"),
  item("product-compliance-expiration", "Product Compliance Expiration", "wordpress-plugin", "repo-exists", "Commerce"),
  item("contractor-before-after-gallery", "Contractor Before After Gallery", "wordpress-plugin", "repo-exists", "Contractors"),
  item("daily-aspire", "Daily Aspire", "android", "planned", "Wellness"),
  item("job-application-tracker", "Job Application Tracker", "web-mobile", "planned", "Career")
];

function item(id, name, platform, state, family) {
  return { id, name, platform, state, family };
}

export function buildCatalog() {
  const active = testingApps.map((app) => ({
    id: app.id,
    name: app.name,
    platform: "android",
    state: "active-build",
    family: "Launch apps"
  }));
  return {
    updatedAt: new Date().toISOString(),
    products: [...active, ...upcoming].sort((left, right) => left.name.localeCompare(right.name))
  };
}
