import test from "node:test";
import assert from "node:assert/strict";

import { calculateReadinessScore, evaluateMandatoryGates, summarizeIntegrationState } from "../src/monitoring/readiness.mjs";

test("readiness score respects weights and mandatory gates block release", async () => {
  const score = calculateReadinessScore({
    buildIntegrity: "pass",
    automatedTests: "pass",
    manualQa: "partial",
    securityPrivacy: "pass",
    storeCompliance: "pass",
    docsSupport: "partial",
    releasePrep: "pass",
    healthBlockers: "pass",
  });
  assert.equal(score, 85);

  const gates = evaluateMandatoryGates({
    signerMatch: true,
    qaApproval: true,
    privacyPolicy: false,
  });
  assert.equal(gates.blocked, true);
  assert.deepEqual(gates.failed, ["privacyPolicy"]);
});

test("integration state remains truthful for stale and unavailable data", async () => {
  assert.equal(summarizeIntegrationState({ freshness: "stale" }), "stale");
  assert.equal(summarizeIntegrationState({ error: "quota" }), "unavailable");
  assert.equal(summarizeIntegrationState({ freshness: "current" }), "current");
});
