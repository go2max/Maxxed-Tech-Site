import test from "node:test";
import assert from "node:assert/strict";

import { ROLES, permissionsForRoles } from "../src/auth/roles.mjs";
import { D1PlatformDatabase, MemoryD1Binding, MemoryPlatformDatabase, loadMigrationSql } from "../src/persistence/database.mjs";
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

async function listTable(database, table) {
  return database.transaction((tx) => tx.list(table));
}

test("fresh migration and repeat migration succeed for memory and D1 adapters", async () => {
  const sql = await loadMigrationSql("0001_initial.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_events/);

  const memory = new MemoryPlatformDatabase();
  await applyAllMigrations(memory);
  for (const migration of MIGRATIONS) {
    assert.equal(await memory.hasMigration(migration.id), true);
  }
  await applyAllMigrations(memory);

  const d1 = new D1PlatformDatabase(new MemoryD1Binding());
  await applyAllMigrations(d1);
  for (const migration of MIGRATIONS) {
    assert.equal(await d1.hasMigration(migration.id), true);
  }
  await applyAllMigrations(d1);
});

test("repositories and services cover required record families with append-only audit events", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const qaLead = actor("qa-lead@techmaxxed.com", [ROLES.QA_LEAD]);
  const betaManager = actor("beta-manager@techmaxxed.com", [ROLES.BETA_MANAGER]);
  const docsEditor = actor("docs@techmaxxed.com", [ROLES.DOCUMENTATION_EDITOR]);
  const admin = actor("admin@techmaxxed.com", [ROLES.ADMINISTRATOR]);
  const support = actor("support@techmaxxed.com", [ROLES.SUPPORT]);
  const betaTester = actor("beta-tester@techmaxxed.com", [ROLES.BETA_TESTER]);

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
  const feedback = await services.recordBetaFeedback({ actor: betaTester, requestId: "req-8" }, {
    email: "beta-tester@techmaxxed.com",
    productSlug: "maxxed-remote",
    feedback: "Looks good.",
  });
  const job = await services.createAutomationJob({ actor: qaLead, requestId: "req-9" }, {
    productId: product.id,
    orderedSteps: ["artifact-verify", "launch-smoke"],
    deviceId: "device-1",
    runnerId: "runner-1",
    leaseState: "leased",
    result: { state: "pass" },
    evidence: [{ type: "report", ref: "r1" }],
  });
  const supportCase = await services.createSupportCase({ actor: support, requestId: "req-10" }, {
    email: "customer@example.com",
    subject: "Need help",
    status: "open",
    details: "Pairing issue",
  });
  const incident = await services.recordIncident({ actor: admin, requestId: "req-11" }, {
    productId: product.id,
    severity: "high",
    status: "open",
    evidence: [{ type: "metric", ref: "m1" }],
  });
  const integration = await services.updateIntegrationState({ actor: admin, requestId: "req-12" }, {
    productId: product.id,
    monitorName: "play-reporting",
    freshnessState: "stale",
    details: { lastSuccessAt: null },
  });
  const kb = await services.publishKnowledgeBaseEntry({ actor: docsEditor, requestId: "req-13" }, {
    slug: "release-runbook",
    title: "Release Runbook",
    publicationState: "internal",
    body: "step-by-step",
  });
  const readiness = await services.recordReadinessSnapshot({ actor: admin, requestId: "req-14" }, {
    productId: product.id,
    score: 82,
    mandatoryGates: { signer: true, qa: false },
    evidence: [{ type: "release", id: release.id }],
  });
  const approvedRelease = await services.approveReleaseQa({ actor: qaLead, requestId: "req-15" }, {
    releaseId: release.id,
    releaseNotes: "approved",
  });
  const promotedRelease = await services.promoteReleaseToProduction({ actor: owner, requestId: "req-16" }, {
    releaseId: release.id,
    releaseNotes: "promoted",
    confirmation: "PROMOTE",
  });

  assert.ok(product.id && build.id && plan.id && execution.id && bug.id && beta.id && feedback.id && job.id && supportCase.id && incident.id && integration.id && kb.id && readiness.id && approvedRelease.id && promotedRelease.id);
  const events = await listTable(database, "audit_events");
  assert.equal(events.length, 16);
  assert.equal(services.auditRepository.verifyIntegrity(events), true);
});

test("authorization failures, release gates, and append-only audit protections are enforced", async () => {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const developer = actor("developer@techmaxxed.com", [ROLES.DEVELOPER]);

  await assert.rejects(
    () => services.assignRole({ actor: developer, requestId: "req-deny" }, { userId: "user-1", roleName: ROLES.OWNER }),
    /forbidden:users.manage/,
  );

  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const release = await services.createRelease({ actor: owner, requestId: "req-release" }, {
    productId: "product-1",
    buildId: "build-1",
    stage: "internal_beta",
    qaApprovalState: "pending",
    ownerApprovalState: "pending",
    releaseNotes: "notes",
    blockers: ["manual-check"],
  });

  await assert.rejects(
    () => services.promoteReleaseToProduction({ actor: owner, requestId: "req-promote" }, {
      releaseId: release.id,
      releaseNotes: "promote",
      confirmation: "PROMOTE",
    }),
    /release_gate_failed:qa_approval_required/,
  );

  await assert.rejects(
    () => database.transaction(async (tx) => tx.update("audit_events", "missing", (row) => row)),
    /audit_events_append_only/,
  );
});

test("D1-backed transactions preserve audit integrity under concurrent writes", async () => {
  const database = new D1PlatformDatabase(new MemoryD1Binding());
  await applyAllMigrations(database);
  const services = createPlatformServices(database);
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);

  await Promise.all(Array.from({ length: 10 }, (_, index) => services.createProduct({
    actor: owner,
    requestId: `req-${index}`,
  }, {
    slug: `product-${index}`,
    name: `Product ${index}`,
    packageId: `com.maxxed.product${index}`,
    lifecycleStatus: "development",
  })));

  const events = await listTable(database, "audit_events");
  assert.equal(events.length, 10);
  assert.equal(services.auditRepository.verifyIntegrity(events), true);
});
