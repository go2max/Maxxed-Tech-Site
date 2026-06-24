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
  const runnerSql = await loadMigrationSql("0002_runner_nodes.sql");
  assert.match(runnerSql, /CREATE TABLE IF NOT EXISTS runner_nodes/);
  assert.match(runnerSql, /runner_nodes_identity/);
  const evidenceSql = await loadMigrationSql("0003_test_evidence_objects.sql");
  assert.match(evidenceSql, /CREATE TABLE IF NOT EXISTS test_evidence_objects/);
  assert.match(evidenceSql, /test_evidence_retention/);
  const schedulesSql = await loadMigrationSql("0004_test_schedules.sql");
  assert.match(schedulesSql, /CREATE TABLE IF NOT EXISTS test_schedules/);
  assert.match(schedulesSql, /test_schedules_due/);
  const accessSql = await loadMigrationSql("0005_persistent_access_directory.sql");
  assert.match(accessSql, /CREATE TABLE IF NOT EXISTS access_role_events/);
  assert.match(accessSql, /access_role_events_user/);
  const backupSql = await loadMigrationSql("0006_backup_snapshots.sql");
  assert.match(backupSql, /CREATE TABLE IF NOT EXISTS backup_snapshots/);
  assert.match(backupSql, /backup_snapshots_retention/);
  const knowledgeSql = await loadMigrationSql("0007_knowledge_base_revisions.sql");
  assert.match(knowledgeSql, /CREATE TABLE IF NOT EXISTS knowledge_base_revisions/);
  assert.match(knowledgeSql, /knowledge_base_revisions_number/);

  const memory = new MemoryPlatformDatabase();
  await applyAllMigrations(memory);
  for (const migration of MIGRATIONS) {
    assert.equal(await memory.hasMigration(migration.id), true);
  }
  await applyAllMigrations(memory);

  const d1Binding = new MemoryD1Binding();
  const d1 = new D1PlatformDatabase(d1Binding);
  await applyAllMigrations(d1);
  assert.equal(d1Binding.indexes.has("runner_nodes_identity"), true);
  assert.equal(d1Binding.indexes.has("runner_nodes_last_seen"), true);
  assert.equal(d1Binding.indexes.has("test_evidence_job"), true);
  assert.equal(d1Binding.indexes.has("test_evidence_retention"), true);
  assert.equal(d1Binding.indexes.has("test_schedules_due"), true);
  assert.equal(d1Binding.indexes.has("test_schedules_runner"), true);
  assert.equal(d1Binding.indexes.has("access_role_events_sequence"), true);
  assert.equal(d1Binding.indexes.has("access_role_events_user"), true);
  assert.equal(d1Binding.indexes.has("access_role_events_role"), true);
  assert.equal(d1Binding.indexes.has("users_status"), true);
  assert.equal(d1Binding.indexes.has("backup_snapshots_retention"), true);
  assert.equal(d1Binding.indexes.has("backup_snapshots_created"), true);
  assert.equal(d1Binding.indexes.has("knowledge_base_revisions_number"), true);
  assert.equal(d1Binding.indexes.has("knowledge_base_revisions_state"), true);
  assert.equal(d1Binding.indexes.has("knowledge_base_revisions_entry"), true);
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
  const runnerNode = await services.recordRunnerHeartbeat({ actor: qaLead, requestId: "req-runner" }, {
    runnerId: "runner-1",
    deviceId: "device-1",
    productIds: ["maxxed-remote"],
    agentVersion: "2.1.0",
  });
  assert.equal(runnerNode.runner_id, "runner-1");
  assert.equal((await listTable(database, "runner_nodes")).length, 1);

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
  assert.deepEqual(events.map((event) => event.sequence), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.equal(new Set(events.map((event) => event.previous_hash)).size, 16);
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

test("D1-backed transactions preserve audit integrity under concurrent writers", async () => {
  const binding = new MemoryD1Binding();
  const databases = [new D1PlatformDatabase(binding), new D1PlatformDatabase(binding)];
  await applyAllMigrations(databases[0]);
  await applyAllMigrations(databases[1]);
  const services = databases.map((database) => createPlatformServices(database));
  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);

  await Promise.all(Array.from({ length: 10 }, (_, index) => services[index % services.length].createProduct({
    actor: owner,
    requestId: `req-${index}`,
  }, {
    slug: `product-${index}`,
    name: `Product ${index}`,
    packageId: `com.maxxed.product${index}`,
    lifecycleStatus: "development",
  })));

  const events = await listTable(databases[0], "audit_events");
  assert.equal(events.length, 10);
  assert.deepEqual(events.map((event) => event.sequence), Array.from({ length: 10 }, (_, index) => index + 1));
  assert.equal(services[0].auditRepository.verifyIntegrity(events), true);
});

test("D1 batch emulation rolls back every statement after an audit-head conflict", async () => {
  const binding = new MemoryD1Binding();
  const database = new D1PlatformDatabase(binding);
  await applyAllMigrations(database);

  const product = binding.prepare('INSERT INTO "products" ("id", "created_at") VALUES (?, ?)').bind("product-rollback", "2026-06-23T00:00:00.000Z");
  const firstAudit = binding.prepare('INSERT INTO "audit_events" ("id", "sequence", "previous_hash", "event_hash", "created_at") VALUES (?, ?, ?, ?, ?)').bind("audit-1", 1, "root", "hash-1", "2026-06-23T00:00:00.000Z");
  const conflictingAudit = binding.prepare('INSERT INTO "audit_events" ("id", "sequence", "previous_hash", "event_hash", "created_at") VALUES (?, ?, ?, ?, ?)').bind("audit-2", 1, "root", "hash-2", "2026-06-23T00:00:00.000Z");

  await assert.rejects(() => binding.batch([product, firstAudit, conflictingAudit]), /audit_head_conflict/);
  const products = await binding.prepare('SELECT * FROM "products" ORDER BY created_at ASC, id ASC').all();
  const events = await binding.prepare('SELECT * FROM "audit_events" ORDER BY sequence ASC').all();
  assert.equal(products.results.length, 0);
  assert.equal(events.results.length, 0);
});


test("concurrent D1 pool claims enforce one active lease per device", async () => {
  const binding = new MemoryD1Binding();
  const databases = [new D1PlatformDatabase(binding), new D1PlatformDatabase(binding)];
  await applyAllMigrations(databases[0]);
  const services = databases.map((database) => createPlatformServices(database));
  const qaLead = actor("qa-lead@techmaxxed.com", [ROLES.QA_LEAD]);
  const runner = actor("pool-runner@runner.internal", [ROLES.QA_TESTER]);

  for (let index = 0; index < 2; index += 1) {
    await services[0].createAutomationJob({ actor: qaLead, requestId: `queue-${index}` }, {
      productId: "maxxed-remote",
      orderedSteps: ["artifact-verify"],
      runnerId: "auto",
      deviceId: "auto",
      leaseState: "queued",
      result: {},
      evidence: [],
    });
  }

  const outcomes = await Promise.allSettled(services.map((service, index) =>
    service.claimAutomationJob({ actor: runner, requestId: `claim-${index}` }, {
      runnerId: "pool-runner",
      deviceId: "pool-device",
      productIds: ["maxxed-remote"],
    })
  ));
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejection = outcomes.find((outcome) => outcome.status === "rejected");
  assert.match(rejection.reason.message, /runner_capacity_conflict:device_busy/);

  const jobs = await listTable(databases[0], "automation_jobs");
  assert.equal(jobs.filter((job) => job.lease_state === "running").length, 1);
  assert.equal(jobs.filter((job) => job.lease_state === "queued").length, 1);
  const audit = await listTable(databases[0], "audit_events");
  assert.equal(audit.filter((event) => event.action_name === "automation_job.claim").length, 1);
});
