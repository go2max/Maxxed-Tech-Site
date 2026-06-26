import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { validateAdminProductionConfig } from "../admin/src/production-config.mjs";

const example = await readFile("admin/wrangler.example.toml", "utf8");
for (const forbidden of ["password=", "private_key=", "token=", "secret="]) {
  assert.equal(example.toLowerCase().includes(forbidden), false, `example config must not contain ${forbidden}`);
}

const safe = validateAdminProductionConfig({
  ADMIN_ENV: "production",
  ADMIN_PUBLIC_HOST: "admin.techmaxxed.com",
  ADMIN_REQUIRE_ACCESS: "true",
  ADMIN_ALLOW_MOCK_IDENTITY: "false",
  ADMIN_ALLOWED_EMAIL_DOMAINS: "techmaxxed.com",
  ADMIN_D1_DATABASE_ID: "configured",
  ADMIN_R2_BUCKET: "configured"
});
assert.equal(safe.ok, true);

const unsafe = validateAdminProductionConfig({
  ADMIN_ENV: "production",
  ADMIN_PUBLIC_HOST: "admin.techmaxxed.com",
  ADMIN_REQUIRE_ACCESS: "false",
  ADMIN_ALLOW_MOCK_IDENTITY: "true"
});
assert.equal(unsafe.ok, false);
assert.ok(unsafe.errors.includes("cloudflare_access_required"));
assert.ok(unsafe.errors.includes("mock_identity_forbidden_in_production"));

console.log("admin production config validation passed");
