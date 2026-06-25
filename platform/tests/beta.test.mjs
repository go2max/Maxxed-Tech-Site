import test from "node:test";
import assert from "node:assert/strict";

import { createBetaAdapters, revokePublicCredit, validateBetaSubmission } from "../src/beta/adapters.mjs";

test("beta submission validation and revocation preserve separate consent state", () => {
  const valid = validateBetaSubmission({
    email: "Tester@Example.com",
    interests: ["maxxed-remote"],
    consentVersion: "2026-06-24",
    publicCreditConsent: true,
    creditName: "Day One Tester",
    device: { model: "Pixel 8" },
  });

  assert.equal(valid.email, "tester@example.com");
  assert.deepEqual(valid.interests, ["maxxed-remote"]);
  assert.equal(valid.creditName, "Day One Tester");
  const revoked = revokePublicCredit({ ...valid, creditDisplayState: "approved" });
  assert.equal(revoked.publicCreditConsent, false);
  assert.equal(revoked.creditDisplayState, "withdrawn");
});

test("disabled adapters fail closed without credentials", async () => {
  const adapters = createBetaAdapters();
  assert.equal(adapters.googleWorkspace.status().state, "unavailable");
  assert.equal(adapters.googlePlay.status().state, "unavailable");
  await assert.rejects(() => adapters.googleWorkspace.enrollTester({}), /integration_unavailable/);
  await assert.rejects(() => adapters.googleWorkspace.removeTester({}), /integration_unavailable/);
  await assert.rejects(() => adapters.googlePlay.syncTrack({}), /integration_unavailable/);
  await assert.rejects(() => adapters.googlePlay.fetchReportingMetrics({}), /integration_unavailable/);
});

test("configured adapter contracts produce bounded Google payloads without live credentials", () => {
  const adapters = createBetaAdapters({
    GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL: "workspace-sync@techmaxxed.com",
    GOOGLE_PLAY_PACKAGE_NAME: "com.maxxedtechnicalsystems.maxxedremote",
  });

  assert.equal(adapters.googleWorkspace.status().state, "configured");
  assert.deepEqual(adapters.googleWorkspace.buildMembershipPayload({
    email: "Tester@Example.com",
    groupEmail: "remote-beta@groups.techmaxxed.com",
  }), {
    email: "tester@example.com",
    groupEmail: "remote-beta@groups.techmaxxed.com",
    role: "MEMBER",
  });

  assert.equal(adapters.googlePlay.status().state, "configured");
  assert.deepEqual(adapters.googlePlay.buildTrackSyncPayload({
    productSlug: "maxxed-remote",
    trackName: "closed-beta",
    groupEmail: "remote-beta@groups.techmaxxed.com",
  }), {
    packageName: "com.maxxedtechnicalsystems.maxxedremote",
    productSlug: "maxxed-remote",
    trackName: "closed-beta",
    groupEmail: "remote-beta@groups.techmaxxed.com",
  });

  const reporting = adapters.googlePlay.buildReportingSyncRecord({
    productSlug: "maxxed-remote",
    trackName: "closed-beta",
    collectedAt: "2026-06-24T12:00:00.000Z",
    metrics: { installs: 12, crashes: 0 },
  });
  assert.equal(reporting.metrics.installs, 12);
});

test("invalid beta submissions fail closed", () => {
  assert.throws(() => validateBetaSubmission({ email: "bad", interests: ["maxxed-remote"], consentVersion: "2026-06-24" }), /invalid_email/);
  assert.throws(() => validateBetaSubmission({ email: "tester@example.com", interests: [], consentVersion: "2026-06-24" }), /missing_interests/);
  assert.throws(() => validateBetaSubmission({ email: "tester@example.com", interests: ["maxxed-remote"], consentVersion: "v1" }), /invalid_consent_version/);
});
