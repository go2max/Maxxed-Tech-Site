import test from "node:test";
import assert from "node:assert/strict";
import { getTrustedAdminEmail, requireAdminIdentity } from "../src/security/production-identity-policy.mjs";

test("trusted identity accepts one allowed Cloudflare Access email", () => {
  const result = getTrustedAdminEmail({ "Cf-Access-Authenticated-User-Email": "owner@techmaxxed.com" }, { allowedDomains: ["techmaxxed.com"], production: true });
  assert.equal(result.ok, true);
});

test("trusted identity rejects missing, mismatched, and outside-domain users", () => {
  assert.equal(getTrustedAdminEmail({}, { production: true }).error, "missing_trusted_identity");
  assert.equal(getTrustedAdminEmail({ "Cf-Access-Authenticated-User-Email": "owner@techmaxxed.com", "X-Authenticated-User-Email": "other@techmaxxed.com" }, { production: true }).error, "mismatched_trusted_identity");
  assert.equal(getTrustedAdminEmail({ "Cf-Access-Authenticated-User-Email": "owner@example.com" }, { allowedDomains: ["techmaxxed.com"], production: true }).error, "identity_domain_not_allowed");
});

test("requireAdminIdentity throws fail-closed errors", () => {
  assert.throws(() => requireAdminIdentity({}, { production: true }), /missing_trusted_identity/);
});
