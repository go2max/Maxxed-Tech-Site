import test from "node:test";
import assert from "node:assert/strict";
import { validateAdminProductionConfig } from "../src/production-config.mjs";

test("production admin config requires access, host, domain allowlist, and D1", () => {
  const result = validateAdminProductionConfig({
    ADMIN_ENV: "production",
    ADMIN_PUBLIC_HOST: "admin.techmaxxed.com",
    ADMIN_REQUIRE_ACCESS: "true",
    ADMIN_ALLOW_MOCK_IDENTITY: "false",
    ADMIN_ALLOWED_EMAIL_DOMAINS: "techmaxxed.com",
    ADMIN_D1_DATABASE_ID: "configured"
  });
  assert.equal(result.ok, true);
});

test("production admin config fails closed when mock identity is enabled", () => {
  const result = validateAdminProductionConfig({
    ADMIN_ENV: "production",
    ADMIN_PUBLIC_HOST: "admin.techmaxxed.com",
    ADMIN_REQUIRE_ACCESS: "true",
    ADMIN_ALLOW_MOCK_IDENTITY: "true",
    ADMIN_ALLOWED_EMAIL_DOMAINS: "techmaxxed.com",
    ADMIN_D1_DATABASE_ID: "configured"
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("mock_identity_forbidden_in_production"));
});
