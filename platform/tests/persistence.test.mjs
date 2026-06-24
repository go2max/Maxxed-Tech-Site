import test from "node:test";
import assert from "node:assert/strict";

import { ROLES, permissionsForRoles } from "../src/auth/roles.mjs";
import { MemoryPlatformDatabase, loadMigrationSql } from "../src/persistence/database.mjs";
import { applyAllMigrations, MIGRATIONS } from "../src/persistence/migrations.mjs";
import { createPlatformServices } from "../src/persistence/services.mjs";

function actor(email, roles) {
  return {
    email,
    subject: `sub:${email}`,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

test("fresh migration and repeat migration succeed", async () => {
  const database = new MemoryPlatformDatabase();
  const sql = await loadMigrationSql("0001_initial.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_events/);

  await applyAllMigrations(database);
  assert.deepEqual([...database.appliedMigrations], MIGRATIONS.map((migration) => migration.id));

  await applyAllMigrations(database);
  assert.deepEqual([...database.appliedMigrations], MIGRATIONS.map((migration) => migration.id));
});

test("repositories and services cover the required record families with audit events", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const qaLead = actor("qa-lead@techmaxxed.com", [ROLES.QA_LEAD]);
  const betaManager = actor("beta-manager@techmaxxed.com", [ROLES.BETA_MANAGER]);
  const docsEditor = actor("docs@techmaxxed.com", [ROLES.DOCUMENTATION_EDITOR]);
  const analytics = actor("analytics@techmaxxed.com", [ROLES.ANALYTICS_VIEWER]);

  const product = await services.createProduct({ actor: owner, requestId: "req-1" }, {
    slug: "maxxed-remote",
    name: "Maxxed Remote",
    packageId: "com.maxxed.remote",
    lifecycleStatus: "internal_beta",
  });
  const build = await services.recordBuild({ actor: owner, requestId: "req-2" }, {
    productId: product.id,
    versionName: "1.2.0",
    versionCode: 120,
    artifactSha256: "abc123",
    signerFingerprint: "signer-1",
    signingMetadata: { signer: "signer-1", channel: "internal" },
  });
  const release = await services.createRelease({ actor: owner, requestId: "req-3" }, {
    productId: product.id,
    buildId: build.id,
    stage: "internal_beta",
    qaApprovalState: "pending",
    ownerApprovalState: "pending",
    releaseNotes: "notes",
    blockers: [],
  });
  const plan = await services.createQaPlan({ actor: qaLead, requestId: "req-4" }, {
    productId: product.id,
    versionLabel: "1.2.0-plan",
    assignments: ["smoke"],
    testCases: ["launch"],
  });
  const execution = await services.recordQaExecution({ actor: qaLead, requestId: "req-5" }, {
    qaPlanId: plan.id,
    assigneeEmail: "qa-tester@techmaxxed.com",
    resultState: "pass",
    evidence: [{ type: "screenshot", ref: "e1" }],
  });
  const bug = await services.reportBug({ actor: qaLead, requestId: "req-6" }, {
    productId: product.id,
    severity: "medium",
    priority: "next_release",
    status: "triaged",
    ownerEmail: "developer@techmaxxed.com",
    verification: { state: "pending" },
  });
  const beta = await services.reviewBetaApplication({ actor: betaManager, requestId: "req-7" }, {
    email: "tester@example.com",
    device: { model: "Pixel 8" },
    interests: ["maxxed-remote"],
    status: "approved",
    credits: { total: 1 },
    consent: { publicCredit: true },
  });
  const job = await services.createAutomationJob({ actor: qaLead, requestId: "req-8" }, {
    productId: product.id,
    orderedSteps: ["artifact-verify", "launch-smoke"],
    deviceId: "device-1",
    runnerId: "runner-1",
    leaseState: "leased",
    result: { state: "pass" },
    evidence: [{ type: "report", ref: "r1" }],
  });
  const incident = await services.recordIncident({ actor: owner, requestId: "req-9" }, {
    productId: product.id,
    severity: "high",
    status: "open",
    evidence: [{ type: "metric", ref: "m1" }],
  });
  const integration = await services.updateIntegrationState({ actor: analytics, requestId: "req-10" }, {
    productId: product.id,
    monitorName: "play-reporting",
    freshnessState: "stale",
    details: { lastSuccessAt: null },
  });
  const kb = await services.publishKnowledgeBaseEntry({ actor: docsEditor, requestId: "req-11" }, {
    slug: "release-runbook",
    title: "Release Runbook",
    publicationState: "internal",
    body: "step-by-step",
  });
  const readiness = await services.recordReadinessSnapshot({ actor: analytics, requestId: "req-12" }, {
    productId: product.id,
    score: 82,
    mandatoryGates: { signer: true, qa: false },
    evidence: [{ type: "release", id: release.id }],
  });

  assert.ok(product.id && build.id && release.id && plan.id && execution.id && bug.id && beta.id && job.id && incident.id && integration.id && kb.id && readiness.id);
  const events = services.auditRepository.list({ list: (table) => database.tables[table] ? [...database.tables[table].values()] : [] });
  assert.equal(events.length, 12);
  assert.equal(services.auditRepository.verifyIntegrity(events), true);
});

test("authorization failures and append-only audit protections are enforced", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const developer = actor("developer@techmaxxed.com", [ROLES.DEVELOPER]);

  await assert.rejects(
    () => services.assignRole({ actor: developer, requestId: "req-deny" }, { userId: "user-1", roleName: ROLES.OWNER }),
    /forbidden:users.manage/,
  );

  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  await services.createProduct({ actor: owner, requestId: "req-ok" }, {
    slug: "maxxed-compass",
    name: "Maxxed Compass",
    packageId: "com.maxxed.compass",
    lifecycleStatus: "development",
  });

  await assert.rejects(
    () => database.transaction((tx) => tx.update("audit_events", services.auditRepository.list(tx)[0].id, (row) => row)),
    /audit_events_append_only/,
  );
});
