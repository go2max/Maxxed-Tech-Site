import test from "node:test";
import assert from "node:assert/strict";

import { createBetaAdapters, revokePublicCredit, validateBetaSubmission } from "../src/beta/adapters.mjs";

test("beta submission validation and revocation preserve separate consent state", async () => {
  const valid = validateBetaSubmission({
    email: "Tester@Example.com",
    interests: ["maxxed-remote"],
    consentVersion: "2026-06-23",
    publicCreditConsent: true,
    device: { model: "Pixel 8" },
  });

  assert.equal(valid.email, "tester@example.com");
  const revoked = revokePublicCredit({ ...valid, creditDisplayState: "approved" });
  assert.equal(revoked.publicCreditConsent, false);
  assert.equal(revoked.creditDisplayState, "withdrawn");
});

test("disabled adapters fail closed without credentials", async () => {
  const adapters = createBetaAdapters();
  assert.equal(adapters.googleWorkspace.status().state, "unavailable");
  assert.equal(adapters.googlePlay.status().state, "unavailable");
  await assert.rejects(() => adapters.googleWorkspace.enrollTester({}), /integration_unavailable/);
  await assert.rejects(() => adapters.googlePlay.enrollTester({}), /integration_unavailable/);
});
