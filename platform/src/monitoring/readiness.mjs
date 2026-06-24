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

export const READINESS_STATES = Object.freeze(["pass", "partial", "fail", "blocked", "not_run", "not_applicable"]);

export const STAGE_THRESHOLDS = Object.freeze({
  development: 0,
  internal_qa: 50,
  internal_beta: 70,
  closed_beta: 80,
  open_beta: 90,
  production: 95,
});

export const PRODUCTION_GATES = Object.freeze([
  "artifactBuild",
  "packageIdentity",
  "signerIdentity",
  "nonDebuggable",
  "automatedTests",
  "physicalQa",
  "criticalBlockers",
  "highSecurityPrivacy",
  "privacyDataSafety",
  "supportDestinations",
  "storeAssets",
  "releaseNotesRollback",
  "qaApproval",
]);

const STAGE_GATES = Object.freeze({
  development: Object.freeze([]),
  internal_qa: Object.freeze(["artifactBuild", "packageIdentity"]),
  internal_beta: Object.freeze(["artifactBuild", "packageIdentity", "automatedTests", "privacyDataSafety"]),
  closed_beta: Object.freeze(["artifactBuild", "packageIdentity", "automatedTests", "privacyDataSafety", "physicalQa", "supportDestinations"]),
  open_beta: Object.freeze(["artifactBuild", "packageIdentity", "automatedTests", "privacyDataSafety", "physicalQa", "supportDestinations", "storeAssets", "releaseNotesRollback", "highSecurityPrivacy"]),
  production: PRODUCTION_GATES,
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

function latestBy(items, keyFor) {
  const latest = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const current = latest.get(key);
    if (!current || String(item.created_at).localeCompare(String(current.created_at)) > 0) {
      latest.set(key, item);
    }
  }
  return latest;
}

function effectiveEvidenceState(evidence, now) {
  if (evidence.expires_at && Date.parse(evidence.expires_at) <= now) return "blocked";
  return READINESS_STATES.includes(evidence.result_state) ? evidence.result_state : "not_run";
}

export function buildReadinessAssessment(evidence, { stage = "development", now = Date.now() } = {}) {
  if (!(stage in STAGE_THRESHOLDS)) throw new Error("invalid_readiness_stage");
  const latestCategories = latestBy(evidence, (item) => item.category);
  const categories = Object.fromEntries(Object.keys(READINESS_WEIGHTS).map((category) => {
    const item = latestCategories.get(category);
    return [category, item ? effectiveEvidenceState(item, now) : "not_run"];
  }));
  const latestGates = latestBy(evidence.filter((item) => item.gate_key), (item) => item.gate_key);
  const requiredGates = new Set(STAGE_GATES[stage]);
  evidence.filter((item) => Number(item.mandatory_gate) === 1 && item.gate_key)
    .forEach((item) => requiredGates.add(item.gate_key));
  const gates = Object.fromEntries([...requiredGates].sort().map((gate) => {
    const item = latestGates.get(gate);
    return [gate, Boolean(item && effectiveEvidenceState(item, now) === "pass")];
  }));
  const score = calculateReadinessScore(categories);
  const gateState = evaluateMandatoryGates(gates);
  const threshold = STAGE_THRESHOLDS[stage];
  const thresholdMet = score >= threshold;
  return {
    stage,
    score,
    threshold,
    thresholdMet,
    blocked: gateState.blocked,
    releaseState: gateState.blocked ? "blocked" : thresholdMet ? "ready" : "not_ready",
    categories,
    gates,
    failedGates: gateState.failed,
    evidenceIds: [...latestCategories.values(), ...latestGates.values()].map((item) => item.id).filter((id, index, values) => values.indexOf(id) === index),
  };
}

export function summarizeIntegrationState(snapshot) {
  if (snapshot.error) return "unavailable";
  if (snapshot.freshness === "stale") return "stale";
  return "current";
}
