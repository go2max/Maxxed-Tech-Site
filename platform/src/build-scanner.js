import { buildCatalog } from "./build-catalog.js";

const existingProducts = [
  { id: "maxxed-remote", name: "Maxxed Remote", family: "Launch apps", platform: "android" },
  { id: "maxxed-compass", name: "Maxxed Compass", family: "Launch apps", platform: "android" },
  { id: "maxxed-measure", name: "Maxxed Measure", family: "Launch apps", platform: "android" },
  { id: "fishing-maxxed", name: "Fishing Maxxed", family: "Launch apps", platform: "android" },
  { id: "rival-rush", name: "Rival Rush", family: "Launch apps", platform: "android" },
  { id: "maxxed-gold-estimator", name: "Maxxed Gold Estimator", family: "Launch apps", platform: "android" }
];

const extensionFamilies = new Map([
  ["Website QA", ["broken-link-capture", "form-field-tester", "page-metadata-inspector", "local-seo-page-checker"]],
  ["SEO", ["local-seo-page-checker", "page-metadata-inspector"]],
  ["Documents", ["business-letter-builder", "template-variable-manager", "simple-proposal-builder"]],
  ["Security", ["wordpress-role-auditor", "security-header-audit"]],
  ["Commerce", ["product-compliance-expiration"]]
]);

function tokens(value) {
  return new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

function overlapScore(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared++;
  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function bestExistingMatch(product) {
  return existingProducts
    .map((existing) => ({
      ...existing,
      score: Math.max(
        product.id === existing.id ? 1 : 0,
        overlapScore(product.id, existing.id),
        overlapScore(product.name, existing.name)
      )
    }))
    .sort((left, right) => right.score - left.score)[0];
}

export function scanCatalogSelection(productIds) {
  const catalog = buildCatalog();
  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  const selected = [...new Set(Array.isArray(productIds) ? productIds.map(String) : [])];
  const results = selected.map((id) => {
    const product = byId.get(id);
    if (!product) {
      return { id, decision: "needs-human-review", confidence: 0, reasons: ["Catalog item was not found."] };
    }
    const exact = existingProducts.find((existing) => existing.id === product.id);
    if (exact) {
      return {
        id: product.id,
        name: product.name,
        decision: "extend-existing",
        confidence: 0.98,
        targetProductId: exact.id,
        reasons: ["Catalog item is already an active product.", "Build work should extend the current repository instead of creating a duplicate."]
      };
    }
    const related = extensionFamilies.get(product.family) || [];
    const familySibling = related.find((candidate) => candidate !== product.id && byId.has(candidate));
    const best = bestExistingMatch(product);
    if (best.score >= 0.72) {
      return {
        id: product.id,
        name: product.name,
        decision: "duplicate",
        confidence: Number(best.score.toFixed(2)),
        targetProductId: best.id,
        reasons: [`Name/id strongly overlaps with ${best.name}.`, "Manual review should confirm before building anything new."]
      };
    }
    if (familySibling && product.state !== "planned") {
      return {
        id: product.id,
        name: product.name,
        decision: "new-product",
        confidence: 0.74,
        targetProductId: null,
        reasons: [`${product.family} has related products but this item has a distinct catalog ID.`, "Build as its own product unless a later GPT pass finds a stronger merge target."]
      };
    }
    if (product.platform === "web-mobile" || product.state === "planned") {
      return {
        id: product.id,
        name: product.name,
        decision: "needs-human-review",
        confidence: 0.55,
        targetProductId: null,
        reasons: ["Planned or cross-platform items need scope review before creating a repository or adding to an existing app."]
      };
    }
    return {
      id: product.id,
      name: product.name,
      decision: "new-product",
      confidence: 0.82,
      targetProductId: null,
      reasons: ["No active product or high-confidence duplicate match found.", "Safe candidate for a standalone build queue item."]
    };
  });
  return { scannedAt: new Date().toISOString(), results };
}
