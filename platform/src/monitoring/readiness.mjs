export const READINESS_WEIGHTS = Object.freeze({
  buildIntegrity: 15,
  automatedTests: 15,
  manualQa: 20,
  securityPrivacy: 15,
  storeCompliance: 10,
  docsSupport: 10,
  releasePrep: 5,
  healthBlockers: 10,
});

export function calculateReadinessScore(results) {
  let total = 0;
  for (const [key, weight] of Object.entries(READINESS_WEIGHTS)) {
    const state = results[key] || "not_run";
    if (state === "pass") total += weight;
    else if (state === "partial") total += weight / 2;
  }
  return total;
}

export function evaluateMandatoryGates(gates) {
  const failed = Object.entries(gates).filter(([, value]) => value !== true).map(([key]) => key);
  return {
    failed,
    blocked: failed.length > 0,
  };
}

export function summarizeIntegrationState(snapshot) {
  if (snapshot.error) return "unavailable";
  if (snapshot.freshness === "stale") return "stale";
  return "current";
}
