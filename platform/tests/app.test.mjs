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

async function bootstrap(email, path = "/") {
  const app = createPlatformApp({ logSink: [] });
  const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    headers: trustedHeaders(email),
  }));
  return {
    app,
    response,
    cookie: response.headers.get("set-cookie"),
    csrfToken: /<code data-csrf-token>([^<]+)<\/code>/.exec(await response.clone().text())?.[1],
  };
}

test("health endpoint exposes no sensitive configuration", async () => {
  const app = createPlatformApp();
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/health"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal("sessionSecret" in body, false);
  assert.equal("trustedIdentityEmailHeader" in body, false);
});

test("unauthenticated requests are rejected", async () => {
  const app = createPlatformApp({ logSink: [] });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/"));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "authentication_required", requestId: response.headers.get("x-request-id") });
});

test("every role is allowed its representative action", async () => {
  const cases = [
    ["owner@techmaxxed.com", "POST", "/releases/promote-production"],
    ["admin@techmaxxed.com", "GET", "/users"],
    ["developer@techmaxxed.com", "POST", "/products"],
    ["qa-lead@techmaxxed.com", "POST", "/releases/approve-qa"],
    ["qa-tester@techmaxxed.com", "POST", "/qa/executions", "/"],
    ["beta-manager@techmaxxed.com", "POST", "/beta/applications/review"],
    ["beta-tester@techmaxxed.com", "POST", "/beta/portal/feedback", "/beta/portal"],
    ["support@techmaxxed.com", "POST", "/support/cases", "/"],
    ["docs@techmaxxed.com", "POST", "/docs/publish", "/docs/editor"],
    ["analytics@techmaxxed.com", "GET", "/analytics", "/analytics"],
  ];

  for (const [email, method, path, bootstrapPath = "/"] of cases) {
    const { app, cookie, csrfToken } = await bootstrap(email, bootstrapPath);
    const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
      method,
      headers: {
        ...trustedHeaders(email),
        cookie,
        origin: "https://admin.techmaxxed.com",
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: method === "GET" ? undefined : JSON.stringify({ ok: true }),
    }));
    assert.equal(response.status, 200, `${email} should reach ${path}`);
  }
});

test("roles are denied representative actions they should not perform", async () => {
  const cases = [
    ["developer@techmaxxed.com", "POST", "/releases/promote-production"],
    ["qa-lead@techmaxxed.com", "GET", "/users"],
    ["beta-manager@techmaxxed.com", "POST", "/products"],
    ["support@techmaxxed.com", "POST", "/docs/publish", "/"],
  ];

  for (const [email, method, path, bootstrapPath = "/"] of cases) {
    const { app, cookie, csrfToken } = await bootstrap(email, bootstrapPath);
    const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
      method,
      headers: {
        ...trustedHeaders(email),
        cookie,
        origin: "https://admin.techmaxxed.com",
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: method === "GET" ? undefined : JSON.stringify({ ok: true }),
    }));
    assert.equal(response.status, 403, `${email} must be denied ${path}`);
  }
});

test("browser supplied role headers cannot override trusted identity", async () => {
  const logSink = [];
  const app = createPlatformApp({ logSink });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/releases/promote-production", {
    method: "POST",
    headers: {
      ...trustedHeaders("developer@techmaxxed.com"),
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-maxxed-role": "Owner",
      "x-csrf-token": "fake",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(response.status, 403);
  assert.match(JSON.stringify(logSink), /ignored_browser_role_claim/);
  assert.match(JSON.stringify(logSink), /forbidden/);
});

test("csrf and invalid origin requests fail", async () => {
  const { app, cookie } = await bootstrap("developer@techmaxxed.com");
  const invalidOrigin = await app.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...trustedHeaders("developer@techmaxxed.com"),
      cookie,
      origin: "https://evil.example",
      "content-type": "application/json",
      "x-csrf-token": "bad",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(invalidOrigin.status, 403);
  assert.equal((await invalidOrigin.json()).error, "invalid_origin");

  const { app: csrfApp, cookie: csrfCookie } = await bootstrap("developer@techmaxxed.com");
  const invalidCsrf = await csrfApp.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...trustedHeaders("developer@techmaxxed.com"),
      cookie: csrfCookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": "bad",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(invalidCsrf.status, 403);
  assert.equal((await invalidCsrf.json()).error, "invalid_csrf");
});

test("sensitive values are absent from responses and logs", async () => {
  const logSink = [];
  const app = createPlatformApp({
    logSink,
    env: { SESSION_SECRET: "super-secret-token-value" },
  });

  const response = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: {
      ...trustedHeaders("owner@techmaxxed.com"),
      authorization: "Bearer secret-token",
    },
  }));

  const body = await response.text();
  assert.doesNotMatch(body, /super-secret-token-value/);
  assert.doesNotMatch(body, /authorization/i);
  assert.doesNotMatch(JSON.stringify(logSink), /super-secret-token-value/);
  assert.doesNotMatch(JSON.stringify(logSink), /secret-token/);
});
