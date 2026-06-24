import test from "node:test";
import assert from "node:assert/strict";

import { buildReadinessAssessment, calculateReadinessScore, evaluateMandatoryGates, PRODUCTION_GATES, summarizeIntegrationState } from "../src/monitoring/readiness.mjs";
import { D1PlatformDatabase, MemoryD1Binding } from "../src/persistence/database.mjs";
import { applyAllMigrations } from "../src/persistence/migrations.mjs";
import { createPlatformServices } from "../src/persistence/services.mjs";
import { ROLES, permissionsForRoles } from "../src/auth/roles.mjs";

function actor(email, roles) {
  return { email, subject: `sub:${email}`, roles, permissions: permissionsForRoles(roles) };
}

test("readiness score respects weights and mandatory gates block release", () => {
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

test("assessment uses latest evidence, expires stale evidence, and never lets score bypass production gates", () => {
  const now = Date.parse("2026-06-24T12:00:00.000Z");
  const evidence = Object.keys({
    buildIntegrity: 1,
    automatedTests: 1,
    manualQa: 1,
    securityPrivacy: 1,
    storeCompliance: 1,
    docsSupport: 1,
    releasePrep: 1,
    healthBlockers: 1,
  }).map((category, index) => ({
    id: `category-${index}`,
    category,
    result_state: "pass",
    gate_key: "",
    mandatory_gate: 0,
    expires_at: "",
    created_at: `2026-06-24T0${index}:00:00.000Z`,
  }));
  evidence.push({
    id: "old-tests",
    category: "automatedTests",
    result_state: "fail",
    gate_key: "automatedTests",
    mandatory_gate: 1,
    expires_at: "",
    created_at: "2026-06-23T00:00:00.000Z",
  });
  evidence.push({
    id: "new-tests",
    category: "automatedTests",
    result_state: "pass",
    gate_key: "automatedTests",
    mandatory_gate: 1,
    expires_at: "2026-06-25T00:00:00.000Z",
    created_at: "2026-06-24T10:00:00.000Z",
  });
  const assessment = buildReadinessAssessment(evidence, { stage: "production", now });
  assert.equal(assessment.score, 100);
  assert.equal(assessment.gates.automatedTests, true);
  assert.equal(assessment.releaseState, "blocked");
  assert.equal(assessment.failedGates.length, PRODUCTION_GATES.length - 1);

  const expired = buildReadinessAssessment(evidence, {
    stage: "internal_beta",
    now: Date.parse("2026-06-26T00:00:00.000Z"),
  });
  assert.equal(expired.categories.automatedTests, "blocked");
  assert.equal(expired.gates.automatedTests, false);
  assert.equal(expired.releaseState, "blocked");
});

test("D1 records evidence and calculates audited snapshots server-side", async () => {
  const binding = new MemoryD1Binding();
  const database = new D1PlatformDatabase(binding);
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const admin = actor("admin@techmaxxed.com", [ROLES.ADMINISTRATOR]);
  const product = await services.createProduct({ actor: owner, requestId: "product" }, {
    slug: "maxxed-remote",
    name: "Maxxed Remote",
    packageId: "com.maxxed.remote",
    lifecycleStatus: "internal_beta",
  });
  await services.recordReadinessEvidence({ actor: admin, requestId: "evidence" }, {
    productId: product.id,
    category: "buildIntegrity",
    resultState: "pass",
    source: "signed build inspection",
    reference: "sha256:abc",
    mandatoryGate: true,
    gateKey: "artifactBuild",
    expiresAt: "2027-06-24T00:00:00.000Z",
  });
  const snapshot = await services.calculateReadinessSnapshot({ actor: admin, requestId: "calculate" }, {
    productId: product.id,
    stage: "internal_qa",
  });
  assert.equal(snapshot.score, 15);
  const gates = JSON.parse(snapshot.mandatory_gates_json);
  assert.equal(gates.gates.artifactBuild, true);
  assert.equal(gates.gates.packageIdentity, false);
  assert.equal(gates.releaseState, "blocked");

  const rows = (await binding.prepare('SELECT * FROM "readiness_evidence" ORDER BY created_at ASC, id ASC').all()).results;
  assert.equal(rows.length, 1);
  const audits = (await binding.prepare('SELECT * FROM "audit_events" ORDER BY sequence ASC').all()).results;
  assert.equal(audits.some((event) => event.action_name === "readiness_evidence.record"), true);
  assert.equal(audits.some((event) => event.action_name === "readiness_snapshot.calculate"), true);
});

test("integration state remains truthful for stale and unavailable data", () => {
  assert.equal(summarizeIntegrationState({ freshness: "stale" }), "stale");
  assert.equal(summarizeIntegrationState({ error: "quota" }), "unavailable");
  assert.equal(summarizeIntegrationState({ freshness: "current" }), "current");
});
