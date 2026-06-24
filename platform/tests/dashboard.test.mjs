import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createPlatformApp } from "../src/app.mjs";

const env = {
  APP_ENV: "test",
  SESSION_SECRET: "test-session-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_AUDIENCE: "maxxed-platform",
  TRUSTED_IDENTITY_ISSUER: "https://maxxed.cloudflareaccess.com",
  TRUSTED_IDENTITY_JWT_KEY: "identity-jwt-test-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_JWT_ALGORITHM: "HS256",
};

function signJwt(email) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    iss: env.TRUSTED_IDENTITY_ISSUER,
    aud: env.TRUSTED_IDENTITY_AUDIENCE,
    sub: `sub:${email}`,
    email,
    name: email.split("@")[0],
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const signature = createHmac("sha256", env.TRUSTED_IDENTITY_JWT_KEY).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function trustedHeaders(email) {
  return {
    "cf-access-jwt-assertion": signJwt(email),
    "cf-access-authenticated-user-email": email,
    "cf-access-authenticated-user-id": `sub:${email}`,
    "cf-access-authenticated-user-name": email.split("@")[0],
  };
}

const cases = [
  ["owner@techmaxxed.com", "/portfolio", 200],
  ["owner@techmaxxed.com", "/security/audit", 200],
  ["qa-lead@techmaxxed.com", "/qa", 200],
  ["qa-lead@techmaxxed.com", "/bugs", 200],\n  ["qa-lead@techmaxxed.com", "/testing-functions", 200],
  ["beta-manager@techmaxxed.com", "/beta/applications", 200],
  ["docs@techmaxxed.com", "/knowledge-base", 200],
  ["analytics@techmaxxed.com", "/readiness", 200],
  ["support@techmaxxed.com", "/security/audit", 403],\n  ["support@techmaxxed.com", "/testing-functions", 403],
  ["beta-tester@techmaxxed.com", "/portfolio", 403],
];

test("dashboard routes enforce role-based access and render operational content", async () => {
  const app = createPlatformApp({ env });

  for (const [email, path, expected] of cases) {
    const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
      headers: trustedHeaders(email),
    }));
    assert.equal(response.status, expected, `${email} => ${path}`);
    if (expected === 200) {
      const body = await response.text();
      assert.match(body, /Private Maxxed Operations Platform/);
      assert.match(body, /Maxxed/);
    }
  }
});
