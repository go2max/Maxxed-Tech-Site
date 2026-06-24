export const TESTING_PRODUCTS = Object.freeze([
  Object.freeze({
    id: "maxxed-remote",
    name: "Maxxed Remote",
    packageId: "com.maxxedtechnicalsystems.maxxedremote",
    repository: "go2max/Maxxed-Tech-Site",
    coverage: "Full UX, discovery, and television connection",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "full-ux-connection"]),
  }),
  Object.freeze({
    id: "maxxed-compass",
    name: "Maxxed Compass",
    packageId: "com.maxxed.compass",
    repository: "go2max/Maxxed-Compass",
    coverage: "Launch, crash detection, and visible control inventory",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "ux-inventory"]),
  }),
  Object.freeze({
    id: "maxxed-measure",
    name: "Maxxed Measure",
    packageId: "com.maxxed.measure",
    repository: "go2max/Measurement-Maxxed",
    coverage: "Launch, crash detection, and visible control inventory",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "ux-inventory"]),
  }),
  Object.freeze({
    id: "maxxed-gold-estimator",
    name: "Maxxed Gold Estimator",
    packageId: "com.maxxed.goldestimator",
    repository: "go2max/Gold-Estimator-Maxxed",
    coverage: "Launch, crash detection, and visible control inventory",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "ux-inventory"]),
  }),
  Object.freeze({
    id: "fishing-maxxed",
    name: "Fishing Maxxed",
    packageId: "com.maxxed.fishingmaxxed",
    repository: "go2max/Fishing-Maxxed",
    coverage: "Launch, crash detection, and visible control inventory",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "ux-inventory"]),
  }),
  Object.freeze({
    id: "rival-rush",
    name: "Rival Rush",
    packageId: "com.maxxed_technical_systems.rivalrushlaunch",
    repository: "go2max/Rival-Rush",
    coverage: "Launch, crash detection, and visible control inventory",
    orderedSteps: Object.freeze(["artifact-verify", "launch-smoke", "ux-inventory"]),
  }),
]);

const PRODUCT_BY_ID = new Map(TESTING_PRODUCTS.map((product) => [product.id, product]));

export const TERMINAL_JOB_STATES = Object.freeze([
  "completed",
  "failed",
  "blocked",
  "interrupted",
  "cancelled",
]);

export function getTestingProduct(productId) {
  return PRODUCT_BY_ID.get(productId) || null;
}

export function requireTestingProducts(productIds, maximum = TESTING_PRODUCTS.length) {
  if (!Array.isArray(productIds) || productIds.length === 0 || productIds.length > maximum) {
    throw new Error("invalid_testing_products");
  }
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length !== productIds.length) throw new Error("invalid_testing_products");
  const products = uniqueIds.map((productId) => getTestingProduct(productId));
  if (products.some((product) => !product)) throw new Error("invalid_testing_product");
  return products;
}
