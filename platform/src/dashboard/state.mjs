import { MemoryPlatformDatabase } from "../persistence/database.mjs";
import { applyAllMigrations } from "../persistence/migrations.mjs";
import { createPlatformServices } from "../persistence/services.mjs";
import { ROLES, permissionsForRoles } from "../auth/roles.mjs";

function actor(email, roles) {
  return {
    email,
    subject: `sub:${email}`,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

export async function createSeededPlatformState() {
  const database = new MemoryPlatformDatabase();
  await applyAllMigrations(database);
  const services = createPlatformServices(database);

  const owner = actor("owner@techmaxxed.com", [ROLES.OWNER]);
  const qaLead = actor("qa-lead@techmaxxed.com", [ROLES.QA_LEAD]);
  const betaManager = actor("beta-manager@techmaxxed.com", [ROLES.BETA_MANAGER]);
  const docsEditor = actor("docs@techmaxxed.com", [ROLES.DOCUMENTATION_EDITOR]);
  const analytics = actor("analytics@techmaxxed.com", [ROLES.ANALYTICS_VIEWER]);

  const product = await services.createProduct({ actor: owner, requestId: "seed-1" }, {
    slug: "maxxed-remote",
    name: "Maxxed Remote",
    packageId: "com.maxxed.remote",
    lifecycleStatus: "internal_beta",
  });
  const build = await services.recordBuild({ actor: owner, requestId: "seed-2" }, {
    productId: product.id,
    versionName: "1.2.0",
    versionCode: 120,
    artifactSha256: "abc123",
    signerFingerprint: "signer-1",
    signingMetadata: { signer: "signer-1" },
  });
  await services.createRelease({ actor: owner, requestId: "seed-3" }, {
    productId: product.id,
    buildId: build.id,
    stage: "internal_beta",
    qaApprovalState: "approved",
    ownerApprovalState: "pending",
    releaseNotes: "Seed release",
    blockers: ["physical-device-check"],
  });
  const plan = await services.createQaPlan({ actor: qaLead, requestId: "seed-4" }, {
    productId: product.id,
    versionLabel: "1.2.0-regression",
    assignments: ["smoke", "pairing"],
    testCases: ["launch", "reconnect"],
  });
  await services.recordQaExecution({ actor: qaLead, requestId: "seed-5" }, {
    qaPlanId: plan.id,
    assigneeEmail: "qa-tester@techmaxxed.com",
    resultState: "manual_review",
    evidence: [{ type: "screenshot", ref: "e1" }],
  });
  await services.reportBug({ actor: qaLead, requestId: "seed-6" }, {
    productId: product.id,
    severity: "high",
    priority: "next_release",
    status: "ready_for_qa",
    ownerEmail: "developer@techmaxxed.com",
    verification: { state: "pending" },
  });
  await services.reviewBetaApplication({ actor: betaManager, requestId: "seed-7" }, {
    email: "tester@example.com",
    device: { model: "Pixel 8" },
    interests: ["maxxed-remote"],
    status: "approved",
    credits: { total: 2 },
    consent: { publicCredit: true },
  });
  await services.createAutomationJob({ actor: qaLead, requestId: "seed-8" }, {
    productId: product.id,
    orderedSteps: ["artifact-verify", "launch-smoke"],
    deviceId: "device-1",
    runnerId: "runner-1",
    leaseState: "leased",
    result: { state: "pass" },
    evidence: [{ type: "report", ref: "r1" }],
  });
  await services.recordIncident({ actor: owner, requestId: "seed-9" }, {
    productId: product.id,
    severity: "medium",
    status: "investigating",
    evidence: [{ type: "metric", ref: "m1" }],
  });
  await services.updateIntegrationState({ actor: analytics, requestId: "seed-10" }, {
    productId: product.id,
    monitorName: "play-reporting",
    freshnessState: "stale",
    details: { lastSuccessAt: null },
  });
  await services.publishKnowledgeBaseEntry({ actor: docsEditor, requestId: "seed-11" }, {
    slug: "release-runbook",
    title: "Release Runbook",
    publicationState: "internal",
    body: "Run through staging checks before promotion.",
  });
  await services.recordReadinessSnapshot({ actor: analytics, requestId: "seed-12" }, {
    productId: product.id,
    score: 82,
    mandatoryGates: { qaApproval: true, productionOwner: false },
    evidence: [{ type: "release", ref: product.id }],
  });

  return { database, services };
}
