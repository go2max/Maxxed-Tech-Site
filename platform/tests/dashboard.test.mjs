import test from "node:test";
import assert from "node:assert/strict";

import { createPlatformApp } from "../src/app.mjs";

function trustedHeaders(email) {
  return {
    "cf-access-authenticated-user-email": email,
    "cf-access-authenticated-user-id": `sub:${email}`,
    "cf-access-authenticated-user-name": email.split("@")[0],
  };
}

const cases = [
  ["owner@techmaxxed.com", "/portfolio", 200],
  ["owner@techmaxxed.com", "/security/audit", 200],
  ["qa-lead@techmaxxed.com", "/qa", 200],
  ["qa-lead@techmaxxed.com", "/bugs", 200],
  ["beta-manager@techmaxxed.com", "/beta/applications", 200],
  ["docs@techmaxxed.com", "/knowledge-base", 200],
  ["analytics@techmaxxed.com", "/readiness", 200],
  ["support@techmaxxed.com", "/security/audit", 403],
  ["beta-tester@techmaxxed.com", "/portfolio", 403],
];

test("dashboard routes enforce role-based access and render operational content", async () => {
  const app = createPlatformApp();

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
