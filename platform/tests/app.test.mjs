import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createPlatformApp } from "../src/app.mjs";
import { loadPlatformConfig } from "../src/config.mjs";
import { createSeededPlatformState } from "../src/dashboard/state.mjs";
import { MemoryEvidenceStore } from "../src/evidence/storage.mjs";

const identityEnv = {
  APP_ENV: "test",
  SESSION_SECRET: "test-session-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_AUDIENCE: "maxxed-platform",
  TRUSTED_IDENTITY_ISSUER: "https://maxxed.cloudflareaccess.com",
  TRUSTED_IDENTITY_JWT_KEY: "identity-jwt-test-secret-value-at-least-thirty-two",
  TRUSTED_IDENTITY_JWT_ALGORITHM: "HS256",
  RUNNER_API_TOKEN: "test-runner-api-token-value-at-least-thirty-two",
};

function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", identityEnv.TRUSTED_IDENTITY_JWT_KEY).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function authHeaders(email, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt({
    iss: identityEnv.TRUSTED_IDENTITY_ISSUER,
    aud: identityEnv.TRUSTED_IDENTITY_AUDIENCE,
    sub: `sub:${email}`,
    email,
    name: email.split("@")[0],
    exp: now + 3600,
    iat: now,
  });
  return {
    "cf-access-jwt-assertion": jwt,
    "cf-access-authenticated-user-email": email,
    "cf-access-authenticated-user-id": `sub:${email}`,
    "cf-access-authenticated-user-name": email.split("@")[0],
    ...overrides,
  };
}

async function bootstrap(email, path = "/", app = null, state = null) {
  const resolvedState = state || await createSeededPlatformState();
  const resolvedApp = app || createPlatformApp({ env: identityEnv, state: resolvedState });
  const response = await resolvedApp.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    headers: authHeaders(email),
  }));
  return {
    app: resolvedApp,
    state: resolvedState,
    response,
    cookie: response.headers.get("set-cookie"),
    csrfToken: /<code data-csrf-token>([^<]+)<\/code>/.exec(await response.clone().text())?.[1],
  };
}

test("health endpoint exposes no sensitive configuration", async () => {
  const app = createPlatformApp({ env: identityEnv });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/health"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal("sessionSecret" in body, false);
  assert.equal("trustedIdentityEmailHeader" in body, false);
});

test("unauthenticated and direct-header spoofed requests are rejected", async () => {
  const app = createPlatformApp({ logSink: [], env: identityEnv });
  const unauthenticated = await app.fetch(new Request("https://admin.techmaxxed.com/"));
  assert.equal(unauthenticated.status, 401);

  const spoofed = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: {
      "cf-access-authenticated-user-email": "owner@techmaxxed.com",
      "cf-access-authenticated-user-id": "sub:owner@techmaxxed.com",
      "cf-access-authenticated-user-name": "owner",
    },
  }));
  assert.equal(spoofed.status, 401);
});

test("mismatched mirrored identity headers fail closed", async () => {
  const app = createPlatformApp({ env: identityEnv });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: authHeaders("owner@techmaxxed.com", {
      "cf-access-authenticated-user-email": "admin@techmaxxed.com",
    }),
  }));
  assert.equal(response.status, 401);
});

test("every role is allowed its representative action", async () => {
  const cases = [
    ["owner@techmaxxed.com", "GET", "/security/audit"],
    ["admin@techmaxxed.com", "GET", "/users"],
    ["developer@techmaxxed.com", "POST", "/products", "/", { slug: "maxxed-test", name: "Maxxed Test", packageId: "com.maxxed.test", lifecycleStatus: "internal_beta" }],
    ["qa-lead@techmaxxed.com", "POST", "/releases/approve-qa", "/releases", { releaseIdFromState: true, releaseNotes: "approved" }],
    ["qa-tester@techmaxxed.com", "POST", "/qa/executions", "/qa", { qaPlanId: "qaplan-seed", assigneeEmail: "qa-tester@techmaxxed.com", resultState: "pass", evidence: [] }],
    ["beta-manager@techmaxxed.com", "POST", "/beta/applications/review", "/beta/applications", { email: "tester2@example.com", interests: ["maxxed-remote"], status: "approved", credits: {}, consent: {} }],
    ["beta-tester@techmaxxed.com", "POST", "/beta/portal/feedback", "/beta/portal", { email: "beta-tester@techmaxxed.com", productSlug: "maxxed-remote", feedback: "Looks good." }],
    ["support@techmaxxed.com", "POST", "/support/cases", "/", { email: "customer@example.com", subject: "Need help", status: "open", details: "Pairing issue" }],
    ["docs@techmaxxed.com", "POST", "/docs/publish", "/docs/editor", { slug: "release-runbook", title: "Release Runbook", publicationState: "internal", body: "Updated body" }],
    ["analytics@techmaxxed.com", "GET", "/analytics", "/analytics"],
  ];

  for (const [email, method, path, bootstrapPath = "/", payload = null] of cases) {
    const { app, cookie, csrfToken, state } = await bootstrap(email, bootstrapPath);
    let requestPayload = payload;
    if (payload?.releaseIdFromState) {
      const releaseId = (await state.database.transaction((tx) => tx.list("releases")))[0].id;
      requestPayload = { ...payload, releaseId };
    }
    if (path === "/qa/executions") {
      const qaPlanId = (await state.database.transaction((tx) => tx.list("qa_plans")))[0].id;
      requestPayload = { ...requestPayload, qaPlanId };
    }
    if (requestPayload) {
      delete requestPayload.releaseIdFromState;
    }
    const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
      method,
      headers: {
        ...authHeaders(email),
        cookie,
        origin: "https://admin.techmaxxed.com",
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: method === "GET" ? undefined : JSON.stringify(requestPayload ?? {}),
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
    ["qa-tester@techmaxxed.com", "POST", "/testing-functions/maxxed-remote/jobs/job-example/cancel", "/qa"],
  ];

  for (const [email, method, path, bootstrapPath = "/"] of cases) {
    const { app, cookie, csrfToken } = await bootstrap(email, bootstrapPath);
    const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
      method,
      headers: {
        ...authHeaders(email),
        cookie,
        origin: "https://admin.techmaxxed.com",
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: method === "GET" ? undefined : JSON.stringify({}),
    }));
    assert.equal(response.status, 403, `${email} must be denied ${path}`);
  }
});

test("browser supplied role headers cannot override trusted identity", async () => {
  const logSink = [];
  const app = createPlatformApp({ logSink, env: identityEnv });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/releases/promote-production", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-maxxed-role": "Owner",
      "x-csrf-token": "fake",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(response.status, 403);
  assert.match(JSON.stringify(logSink), /ignored_browser_role_claim/);
});

test("session rotation preserves csrf validity across repeated GET and POST requests", async () => {
  const app = createPlatformApp({ env: identityEnv });
  const first = await bootstrap("developer@techmaxxed.com", "/", app);
  const second = await app.fetch(new Request("https://admin.techmaxxed.com/portfolio", {
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie: first.cookie,
    },
  }));
  assert.equal(second.status, 200);
  const secondCookie = second.headers.get("set-cookie");
  const secondCsrf = /<code data-csrf-token>([^<]+)<\/code>/.exec(await second.text())?.[1];
  assert.ok(secondCookie);
  assert.ok(secondCsrf);

  const post = await app.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie: secondCookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": secondCsrf,
    },
    body: JSON.stringify({
      slug: "maxxed-rotation",
      name: "Rotation Test",
      packageId: "com.maxxed.rotation",
      lifecycleStatus: "development",
    }),
  }));
  assert.equal(post.status, 200);
});

test("csrf, invalid origin, and streamed body limits fail closed", async () => {
  const { app, cookie } = await bootstrap("developer@techmaxxed.com");
  const invalidOrigin = await app.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
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
  const page = await csrfApp.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie: csrfCookie,
    },
  }));
  const csrfToken = /<code data-csrf-token>([^<]+)<\/code>/.exec(await page.text())?.[1];
  const oversized = "x".repeat(20_000);
  const tooLarge = await csrfApp.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie: page.headers.get("set-cookie"),
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ slug: oversized, name: "n", packageId: "p", lifecycleStatus: "l" }),
  }));
  assert.equal(tooLarge.status, 413);
});

test("database-controlled dashboard content is HTML-escaped to prevent stored XSS", async () => {
  const state = await createSeededPlatformState();
  await state.services.publishKnowledgeBaseEntry({
    actor: { email: "docs@techmaxxed.com", subject: "sub:docs@techmaxxed.com", roles: ["Documentation Editor"], permissions: new Set(["docs.publish"]) },
    requestId: "req-xss",
  }, {
    slug: "xss-entry",
    title: "<script>alert(1)</script>",
    publicationState: "internal",
    body: "<img src=x onerror=alert(1)>",
  });
  const app = createPlatformApp({ env: identityEnv, state });
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/knowledge-base", {
    headers: authHeaders("docs@techmaxxed.com"),
  }));
  const body = await response.text();
  assert.doesNotMatch(body, /<script>alert\(1\)<\/script>/);
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("production config fails closed for missing or weak secrets", async () => {
  assert.throws(() => loadPlatformConfig({
    APP_ENV: "production",
    TRUSTED_IDENTITY_AUDIENCE: "aud",
    TRUSTED_IDENTITY_ISSUER: "https://issuer.example",
    TRUSTED_IDENTITY_JWT_KEY: "identity-jwt-test-secret-value-at-least-thirty-two",
  }), /weak_or_missing_session_secret/);

  assert.throws(() => loadPlatformConfig({
    APP_ENV: "production",
    SESSION_SECRET: "x".repeat(32),
  }), /missing_identity_audience/);

  assert.throws(() => loadPlatformConfig({
    APP_ENV: "production",
    SESSION_SECRET: "x".repeat(32),
    TRUSTED_IDENTITY_AUDIENCE: "aud",
    TRUSTED_IDENTITY_ISSUER: "https://issuer.example",
    TRUSTED_IDENTITY_JWT_KEY: "identity-jwt-test-secret-value-at-least-thirty-two",
    TRUSTED_IDENTITY_JWT_ALGORITHM: "HS256",
  }), /production_identity_algorithm_must_be_rs256/);
});

test("authentication and mutation rate limits are enforced", async () => {
  const app = createPlatformApp({
    env: {
      ...identityEnv,
      AUTH_RATE_LIMIT_MAX: "1",
      MUTATION_RATE_LIMIT_MAX: "1",
    },
  });
  const first = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: authHeaders("owner@techmaxxed.com", { "cf-connecting-ip": "1.2.3.4" }),
  }));
  assert.equal(first.status, 200);
  const second = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: authHeaders("owner@techmaxxed.com", { "cf-connecting-ip": "1.2.3.4" }),
  }));
  assert.equal(second.status, 429);

  const mutationState = await createSeededPlatformState();
  const mutationApp = createPlatformApp({
    env: {
      ...identityEnv,
      AUTH_RATE_LIMIT_MAX: "100",
      MUTATION_RATE_LIMIT_MAX: "1",
    },
    state: mutationState,
  });
  const { cookie, csrfToken } = await bootstrap("developer@techmaxxed.com", "/", mutationApp, mutationState);
  const firstMutation = await mutationApp.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      slug: "rate-limit-a",
      name: "Rate Limit A",
      packageId: "com.maxxed.ratea",
      lifecycleStatus: "development",
    }),
  }));
  assert.equal(firstMutation.status, 200);
  const secondMutation = await mutationApp.fetch(new Request("https://admin.techmaxxed.com/products", {
    method: "POST",
    headers: {
      ...authHeaders("developer@techmaxxed.com"),
      cookie: firstMutation.headers.get("set-cookie"),
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      slug: "rate-limit-b",
      name: "Rate Limit B",
      packageId: "com.maxxed.rateb",
      lifecycleStatus: "development",
    }),
  }));
  assert.equal(secondMutation.status, 429);
});

test("sensitive values are absent from responses and logs", async () => {
  const logSink = [];
  const app = createPlatformApp({
    logSink,
    env: { ...identityEnv, SESSION_SECRET: "super-secret-token-value-with-length-32" },
  });

  const response = await app.fetch(new Request("https://admin.techmaxxed.com/", {
    headers: {
      ...authHeaders("owner@techmaxxed.com"),
      authorization: "Bearer secret-token",
    },
  }));

  const body = await response.text();
  assert.doesNotMatch(body, /super-secret-token-value-with-length-32/);
  assert.doesNotMatch(body, /authorization/i);
  assert.doesNotMatch(JSON.stringify(logSink), /super-secret-token-value-with-length-32/);
  assert.doesNotMatch(JSON.stringify(logSink), /secret-token/);
});


test("Remote testing function queues only the server-approved step order", async () => {
  const { app, cookie, csrfToken, state } = await bootstrap("qa-lead@techmaxxed.com", "/testing-functions");
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/maxxed-remote/run", {
    method: "POST",
    headers: {
      ...authHeaders("qa-lead@techmaxxed.com"),
      cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      runnerId: "local-windows-runner",
      deviceId: "android-device-1",
      orderedSteps: ["arbitrary-command"],
    }),
  }));

  assert.equal(response.status, 200);
  const body = await response.json();
  const jobs = await state.database.transaction((tx) => tx.list("automation_jobs"));
  const queuedJob = jobs.find((job) => job.id === body.record.id);
  assert.ok(queuedJob);
  assert.deepEqual(JSON.parse(queuedJob.ordered_steps_json), [
    "artifact-verify",
    "launch-smoke",
    "full-ux-connection",
  ]);
  assert.equal(queuedJob.lease_state, "queued");

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "automation_job.create" && event.target_id === queuedJob.id), true);
});


test("runner API authenticates, claims one owned job, and records completion", async () => {
  const { app, cookie, csrfToken, state } = await bootstrap("qa-lead@techmaxxed.com", "/testing-functions");
  const queued = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/maxxed-remote/run", {
    method: "POST",
    headers: {
      ...authHeaders("qa-lead@techmaxxed.com"),
      cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      runnerId: "local-windows-runner",
      deviceId: "android-device-1",
    }),
  }));
  assert.equal(queued.status, 200);

  const unauthenticated = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runnerId: "local-windows-runner", deviceId: "android-device-1" }),
  }));
  assert.equal(unauthenticated.status, 401);

  const runnerHeaders = {
    authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
    "content-type": "application/json",
  };
  const claimed = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({ runnerId: "local-windows-runner", deviceId: "android-device-1" }),
  }));
  assert.equal(claimed.status, 200);
  const claimedJob = (await claimed.json()).record;
  assert.equal(claimedJob.lease_state, "running");

  const duplicateClaim = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({ runnerId: "local-windows-runner", deviceId: "android-device-1" }),
  }));
  assert.equal(duplicateClaim.status, 404);

  const wrongRunner = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${claimedJob.id}/complete`, {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({ runnerId: "other-runner", status: "completed", result: {}, evidence: [] }),
  }));
  assert.equal(wrongRunner.status, 403);

  const completed = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${claimedJob.id}/complete`, {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "local-windows-runner",
      status: "completed",
      result: {
        finalStatus: "pass",
        steps: [
          { stepId: "artifact-verify", status: "pass" },
          { stepId: "launch-smoke", status: "pass" },
          { stepId: "full-ux-connection", status: "blocked" },
        ],
      },
      evidence: [{ type: "result-json", ref: "reports/result.json" }],
    }),
  }));
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).record.lease_state, "completed");

  const resultsPage = await bootstrap("qa-lead@techmaxxed.com", "/testing-functions", app, state);
  assert.equal(resultsPage.response.status, 200);
  const resultsHtml = await resultsPage.response.text();
  assert.match(resultsHtml, new RegExp(claimedJob.id));
  assert.match(resultsHtml, /completed/);
  assert.match(resultsHtml, /full-ux-connection: blocked/);
  assert.match(resultsHtml, /Evidence records: 1/);

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "automation_job.claim" && event.target_id === claimedJob.id), true);
  assert.equal(audit.some((event) => event.action_name === "automation_job.complete" && event.target_id === claimedJob.id), true);
});


test("Remote job cancellation and retry preserve history and enforce state transitions", async () => {
  const email = "qa-lead@techmaxxed.com";
  const { app, cookie, csrfToken, state } = await bootstrap(email, "/testing-functions");
  const browserHeaders = {
    ...authHeaders(email),
    cookie,
    origin: "https://admin.techmaxxed.com",
    "content-type": "application/json",
    "x-csrf-token": csrfToken,
  };
  const post = (path, body = {}) => app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify(body),
  }));

  const queuedResponse = await post("/testing-functions/maxxed-remote/run", {
    runnerId: "local-windows-runner",
    deviceId: "android-device-1",
  });
  assert.equal(queuedResponse.status, 200);
  const queuedJob = (await queuedResponse.json()).record;

  const cancelResponse = await post(
    `/testing-functions/maxxed-remote/jobs/${encodeURIComponent(queuedJob.id)}/cancel`,
    { reason: "Hardware unavailable" }
  );
  assert.equal(cancelResponse.status, 200);
  const cancelledJob = (await cancelResponse.json()).record;
  assert.equal(cancelledJob.lease_state, "cancelled");
  assert.equal(JSON.parse(cancelledJob.result_json).reason, "Hardware unavailable");

  const duplicateCancel = await post(
    `/testing-functions/maxxed-remote/jobs/${encodeURIComponent(queuedJob.id)}/cancel`
  );
  assert.equal(duplicateCancel.status, 409);
  assert.equal((await duplicateCancel.json()).error, "job_state_conflict:cancel_requires_active");

  const retryResponse = await post(
    `/testing-functions/maxxed-remote/jobs/${encodeURIComponent(queuedJob.id)}/retry`
  );
  assert.equal(retryResponse.status, 200);
  const retryJob = (await retryResponse.json()).record;
  assert.notEqual(retryJob.id, queuedJob.id);
  assert.equal(retryJob.lease_state, "queued");
  assert.equal(JSON.parse(retryJob.result_json).retryOfJobId, queuedJob.id);

  const invalidRetry = await post(
    `/testing-functions/maxxed-remote/jobs/${encodeURIComponent(retryJob.id)}/retry`
  );
  assert.equal(invalidRetry.status, 409);
  assert.equal((await invalidRetry.json()).error, "job_state_conflict:retry_requires_terminal");

  const jobs = await state.database.transaction((tx) => tx.list("automation_jobs"));
  assert.equal(jobs.find((job) => job.id === queuedJob.id).lease_state, "cancelled");
  assert.equal(jobs.find((job) => job.id === retryJob.id).lease_state, "queued");

  const resultsPage = await bootstrap(email, "/testing-functions", app, state);
  const resultsHtml = await resultsPage.response.text();
  assert.match(resultsHtml, /Cancel queued job/);
  assert.match(resultsHtml, /Retry as new job/);
  assert.match(resultsHtml, /Retry of/);
  assert.match(resultsHtml, /Cancelled: 1/);

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "automation_job.cancel" && event.target_id === queuedJob.id), true);
  assert.equal(audit.some((event) => event.action_name === "automation_job.retry" && event.target_id === retryJob.id), true);
});


test("Testing Functions client script parses and exposes lifecycle actions", async () => {
  const { app } = await bootstrap("qa-lead@techmaxxed.com", "/testing-functions");
  const response = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions.js", {
    headers: authHeaders("qa-lead@techmaxxed.com"),
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/javascript/);
  const source = await response.text();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /data-job-action/);
  assert.match(source, /encodeURIComponent\(jobId\)/);
});


test("portfolio batch queueing, capability claims, heartbeats, and cooperative cancellation", async () => {
  const email = "qa-lead@techmaxxed.com";
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const { cookie, csrfToken } = await bootstrap(email, "/testing-functions", app, state);
  const browserHeaders = {
    ...authHeaders(email),
    cookie,
    origin: "https://admin.techmaxxed.com",
    "content-type": "application/json",
    "x-csrf-token": csrfToken,
  };
  const batch = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      productIds: ["maxxed-compass", "rival-rush"],
      runnerId: "portfolio-runner",
      deviceId: "android-device-1",
      orderedSteps: ["arbitrary-command"],
    }),
  }));
  assert.equal(batch.status, 200);
  const queued = (await batch.json()).records;
  assert.equal(queued.length, 2);
  assert.deepEqual(JSON.parse(queued[0].ordered_steps_json), ["artifact-verify", "launch-smoke", "ux-inventory"]);
  assert.deepEqual(JSON.parse(queued[1].ordered_steps_json), ["artifact-verify", "launch-smoke", "ux-inventory"]);
  assert.equal(JSON.parse(queued[0].result_json).packageId, "com.maxxed.compass");
  assert.equal(JSON.parse(queued[1].result_json).packageId, "com.maxxed_technical_systems.rivalrushlaunch");

  const invalidBatch = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      productIds: ["maxxed-compass", "maxxed-compass"],
      runnerId: "portfolio-runner",
      deviceId: "android-device-1",
    }),
  }));
  assert.equal(invalidBatch.status, 400);

  const runnerHeaders = {
    authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
    "content-type": "application/json",
  };
  const claim = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "portfolio-runner",
      deviceId: "android-device-1",
      productIds: ["rival-rush"],
    }),
  }));
  assert.equal(claim.status, 200);
  const running = (await claim.json()).record;
  assert.equal(running.product_id, "rival-rush");

  const heartbeat = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${running.id}/heartbeat`, {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "portfolio-runner",
      progress: { stepId: "launch-smoke", completedSteps: 1 },
    }),
  }));
  assert.equal(heartbeat.status, 200);
  const heartbeatRecord = (await heartbeat.json()).record;
  assert.equal(JSON.parse(heartbeatRecord.result_json).progress.stepId, "launch-smoke");

  const cancel = await app.fetch(new Request(`https://admin.techmaxxed.com/testing-functions/jobs/${running.id}/cancel`, {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({ reason: "Operator stop" }),
  }));
  assert.equal(cancel.status, 200);
  assert.equal((await cancel.json()).record.lease_state, "cancelling");

  const cancellationHeartbeat = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${running.id}/heartbeat`, {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({ runnerId: "portfolio-runner", progress: { stepId: "launch-smoke", completedSteps: 1 } }),
  }));
  assert.equal(cancellationHeartbeat.status, 200);
  assert.equal((await cancellationHeartbeat.json()).record.lease_state, "cancelling");

  const completed = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${running.id}/complete`, {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "portfolio-runner",
      status: "cancelled",
      result: { finalStatus: "cancelled", steps: [] },
      evidence: [],
    }),
  }));
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).record.lease_state, "cancelled");

  const page = await bootstrap(email, "/testing-functions", app, state);
  const html = await page.response.text();
  assert.match(html, /Maxxed Compass/);
  assert.match(html, /Rival Rush/);
  assert.match(html, /com\.maxxed\.compass/);
  assert.match(html, /Queue selected tests/);
  assert.match(html, /Runner heartbeats maintain active leases/);
});

test("stale runner leases are interrupted and audited before the next claim", async () => {
  const email = "qa-lead@techmaxxed.com";
  const state = await createSeededPlatformState();
  const app = createPlatformApp({
    env: { ...identityEnv, RUNNER_LEASE_TTL_MS: "1000" },
    state,
  });
  const { cookie, csrfToken } = await bootstrap(email, "/testing-functions", app, state);
  const browserHeaders = {
    ...authHeaders(email),
    cookie,
    origin: "https://admin.techmaxxed.com",
    "content-type": "application/json",
    "x-csrf-token": csrfToken,
  };
  const queue = async () => {
    const response = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
      method: "POST",
      headers: browserHeaders,
      body: JSON.stringify({
        productIds: ["maxxed-compass"],
        runnerId: "lease-runner",
        deviceId: "lease-device",
      }),
    }));
    return (await response.json()).records[0];
  };
  await queue();
  const runnerHeaders = {
    authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
    "content-type": "application/json",
  };
  const claimRequest = () => app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "lease-runner",
      deviceId: "lease-device",
      productIds: ["maxxed-compass"],
    }),
  }));
  const firstClaim = await claimRequest();
  const staleJob = (await firstClaim.json()).record;
  await state.database.transaction((tx) => tx.update("automation_jobs", staleJob.id, (job) => ({
    ...job,
    updated_at: new Date(0).toISOString(),
  })));
  const nextQueued = await queue();

  const secondClaim = await claimRequest();
  assert.equal(secondClaim.status, 200);
  assert.equal((await secondClaim.json()).record.id, nextQueued.id);

  const jobs = await state.database.transaction((tx) => tx.list("automation_jobs"));
  const expired = jobs.find((job) => job.id === staleJob.id);
  assert.equal(expired.lease_state, "interrupted");
  assert.equal(JSON.parse(expired.result_json).error, "runner_lease_expired");
  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "automation_job.expire" && event.target_id === staleJob.id), true);
});


test("per-runner credentials isolate fleet identities and expose authenticated result details", async () => {
  const runnerAToken = `runner-a-${"a".repeat(40)}`;
  const runnerBToken = `runner-b-${"b".repeat(40)}`;
  const runnerANextToken = `runner-a-next-${"n".repeat(40)}`;
  const state = await createSeededPlatformState();
  const env = {
    ...identityEnv,
    RUNNER_API_TOKENS_JSON: JSON.stringify({
      "runner-a": [runnerAToken, runnerANextToken],
      "runner-b": runnerBToken,
    }),
  };
  const app = createPlatformApp({ env, state });
  const email = "qa-lead@techmaxxed.com";
  const { cookie, csrfToken } = await bootstrap(email, "/testing-functions", app, state);
  const queuedResponse = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: {
      ...authHeaders(email),
      cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      productIds: ["maxxed-compass"],
      runnerId: "runner-a",
      deviceId: "device-a",
    }),
  }));
  const queued = (await queuedResponse.json()).records[0];

  const claimBody = JSON.stringify({
    runnerId: "runner-a",
    deviceId: "device-a",
    productIds: ["maxxed-compass"],
    agentVersion: "2.1.0",
  });
  const wrongIdentity = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runnerBToken}`,
      "content-type": "application/json",
    },
    body: claimBody,
  }));
  assert.equal(wrongIdentity.status, 401);

  const sharedTokenRejected = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: {
      authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: claimBody,
  }));
  assert.equal(sharedTokenRejected.status, 401);

  const claim = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runnerAToken}`,
      "content-type": "application/json",
    },
    body: claimBody,
  }));
  assert.equal(claim.status, 200);
  assert.equal((await claim.json()).record.id, queued.id);

  const completed = await app.fetch(new Request(`https://admin.techmaxxed.com/runner/jobs/${queued.id}/complete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${runnerAToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      runnerId: "runner-a",
      deviceId: "device-a",
      productIds: ["maxxed-compass"],
      agentVersion: "2.1.0",
      status: "completed",
      result: {
        finalStatus: "pass",
        steps: [{ stepId: "launch-smoke", status: "pass", exitCode: 0 }],
      },
      evidence: [
        { stepId: "launch-smoke", type: "screenshot", ref: "reports/screen.png" },
        { stepId: "ux-inventory", type: "malicious", ref: "<img src=x onerror=alert(1)>" },
      ],
    }),
  }));
  assert.equal(completed.status, 200);

  const rotatedTokenCheck = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runnerANextToken}`,
      "content-type": "application/json",
    },
    body: claimBody,
  }));
  assert.equal(rotatedTokenCheck.status, 404);

  const fleetPage = await bootstrap(email, "/testing-functions", app, state);
  const fleetHtml = await fleetPage.response.text();
  assert.match(fleetHtml, /Runner fleet/);
  assert.match(fleetHtml, /runner-a/);
  assert.match(fleetHtml, /Agent: 2\.1\.0/);
  assert.match(fleetHtml, /online/);

  const detail = await app.fetch(new Request(`https://admin.techmaxxed.com/testing-functions/jobs/${queued.id}`, {
    headers: authHeaders(email),
  }));
  assert.equal(detail.status, 200);
  const detailHtml = await detail.text();
  assert.match(detailHtml, /Test Job Detail/);
  assert.match(detailHtml, /Download result JSON/);
  assert.match(detailHtml, /launch-smoke/);
  assert.match(detailHtml, /reports\/screen\.png/);
  assert.doesNotMatch(detailHtml, /<img src=x onerror=alert\(1\)>/);
  assert.match(detailHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);

  const result = await app.fetch(new Request(`https://admin.techmaxxed.com/testing-functions/jobs/${queued.id}/result.json`, {
    headers: authHeaders(email),
  }));
  assert.equal(result.status, 200);
  assert.match(result.headers.get("content-disposition"), /attachment/);
  assert.equal((await result.json()).result.finalStatus, "pass");
});

test("runner token maps and fleet thresholds fail closed when malformed", () => {
  assert.throws(
    () => loadPlatformConfig({ ...identityEnv, RUNNER_API_TOKENS_JSON: "not-json" }),
    /invalid_runner_api_tokens/
  );
  assert.throws(
    () => loadPlatformConfig({
      ...identityEnv,
      RUNNER_API_TOKENS_JSON: JSON.stringify({ "runner-a": "short" }),
    }),
    /invalid_runner_api_tokens/
  );
  assert.throws(
    () => loadPlatformConfig({
      ...identityEnv,
      RUNNER_FLEET_STALE_MS: "1000",
      RUNNER_FLEET_OFFLINE_MS: "500",
    }),
    /invalid_runner_fleet_thresholds/
  );
});


test("runner evidence is private, integrity checked, bounded, and purged with audit", async () => {
  const state = await createSeededPlatformState();
  const evidenceStore = new MemoryEvidenceStore();
  const env = { ...identityEnv, EVIDENCE_MAX_BYTES: "32", EVIDENCE_RETENTION_DAYS: "1" };
  const app = createPlatformApp({ env, state, evidenceStore });
  const email = "qa-lead@techmaxxed.com";
  const { cookie, csrfToken } = await bootstrap(email, "/testing-functions", app, state);
  const queue = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: {
      ...authHeaders(email), cookie, origin: "https://admin.techmaxxed.com",
      "content-type": "application/json", "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      productIds: ["maxxed-remote"],
      runnerId: "evidence-runner",
      deviceId: "evidence-device",
    }),
  }));
  const job = (await queue.json()).records[0];
  const runnerHeaders = {
    authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
    "content-type": "application/json",
  };
  const claim = await app.fetch(new Request("https://admin.techmaxxed.com/runner/jobs/claim", {
    method: "POST",
    headers: runnerHeaders,
    body: JSON.stringify({
      runnerId: "evidence-runner",
      deviceId: "evidence-device",
      productIds: ["maxxed-remote"],
    }),
  }));
  assert.equal(claim.status, 200);

  const bytes = new TextEncoder().encode("bounded evidence");
  const upload = await app.fetch(new Request(
    `https://admin.techmaxxed.com/runner/jobs/${job.id}/evidence/smoke.txt`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
        "x-maxxed-runner-id": "evidence-runner",
        "x-maxxed-step-id": "launch-smoke",
        "content-type": "text/plain",
      },
      body: bytes,
    },
  ));
  assert.equal(upload.status, 200);
  const uploaded = (await upload.json()).record;
  assert.match(uploaded.sha256, /^[a-f0-9]{64}$/);
  assert.equal(uploaded.byteSize, bytes.byteLength);
  assert.equal("objectKey" in uploaded, false);

  const oversized = await app.fetch(new Request(
    `https://admin.techmaxxed.com/runner/jobs/${job.id}/evidence/large.txt`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
        "x-maxxed-runner-id": "evidence-runner",
        "x-maxxed-step-id": "launch-smoke",
        "content-type": "text/plain",
      },
      body: "x".repeat(33),
    },
  ));
  assert.equal(oversized.status, 413);

  const wrongRunner = await app.fetch(new Request(
    `https://admin.techmaxxed.com/runner/jobs/${job.id}/evidence/wrong.txt`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
        "x-maxxed-runner-id": "another-runner",
        "x-maxxed-step-id": "launch-smoke",
        "content-type": "text/plain",
      },
      body: "wrong",
    },
  ));
  assert.equal(wrongRunner.status, 403);

  const anonymous = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/jobs/${job.id}/evidence/${uploaded.id}`
  ));
  assert.equal(anonymous.status, 401);
  const download = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/jobs/${job.id}/evidence/${uploaded.id}`,
    { headers: authHeaders(email) },
  ));
  assert.equal(download.status, 200);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), bytes);
  assert.equal(download.headers.get("x-content-sha256"), uploaded.sha256);
  assert.match(download.headers.get("cache-control"), /no-store/);

  const detail = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/jobs/${job.id}`,
    { headers: authHeaders(email) },
  ));
  const detailHtml = await detail.text();
  assert.match(detailHtml, /Hosted evidence/);
  assert.match(detailHtml, /smoke\.txt/);
  assert.match(detailHtml, new RegExp(uploaded.sha256));

  const metadata = (await state.database.transaction((tx) => tx.list("test_evidence_objects")))[0];
  await evidenceStore.put(metadata.object_key, new TextEncoder().encode("tampered"), { contentType: "text/plain" });
  const tampered = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/jobs/${job.id}/evidence/${uploaded.id}`,
    { headers: authHeaders(email) },
  ));
  assert.equal(tampered.status, 409);
  assert.equal((await tampered.json()).error, "evidence_integrity_failed");

  await state.database.transaction((tx) => tx.update("test_evidence_objects", uploaded.id, (record) => ({
    ...record,
    retention_until: new Date(0).toISOString(),
  })));
  const owner = await bootstrap("owner@techmaxxed.com", "/testing-functions", app, state);
  const purge = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/evidence/purge", {
    method: "POST",
    headers: {
      ...authHeaders("owner@techmaxxed.com"),
      cookie: owner.cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": owner.csrfToken,
    },
    body: "{}",
  }));
  assert.equal(purge.status, 200);
  assert.equal((await purge.json()).purged, 1);
  assert.equal(await evidenceStore.get(metadata.object_key), null);
  const rows = await state.database.transaction((tx) => tx.list("test_evidence_objects"));
  assert.equal(rows[0].storage_state, "deleted");
  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "test_evidence.create"), true);
  assert.equal(audit.some((event) => event.action_name === "test_evidence.delete"), true);
});


test("regression schedules dispatch once, remain controllable, and expose comparisons", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const email = "qa-lead@techmaxxed.com";
  const boot = await bootstrap(email, "/testing-functions", app, state);
  const browserHeaders = {
    ...authHeaders(email),
    cookie: boot.cookie,
    origin: "https://admin.techmaxxed.com",
    "content-type": "application/json",
    "x-csrf-token": boot.csrfToken,
  };
  const create = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/schedules", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      name: "Daily portfolio regression",
      productIds: ["maxxed-remote", "rival-rush"],
      runnerId: "schedule-runner",
      deviceId: "schedule-device",
      cadenceMinutes: 1440,
      nextRunAt: new Date(0).toISOString(),
    }),
  }));
  assert.equal(create.status, 200);
  const schedule = (await create.json()).record;
  assert.equal(schedule.enabled, 1);

  const dispatched = await app.scheduled({}, identityEnv);
  assert.equal(dispatched.schedules.length, 1);
  assert.equal(dispatched.jobs.length, 2);
  assert.deepEqual(dispatched.jobs.map((job) => job.product_id).sort(), ["maxxed-remote", "rival-rush"]);
  assert.equal(JSON.parse(dispatched.jobs[0].result_json).scheduleId, schedule.id);

  const duplicate = await app.scheduled({}, identityEnv);
  assert.equal(duplicate.jobs.length, 0);

  const page = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions", {
    headers: authHeaders(email),
  }));
  const html = await page.text();
  assert.match(html, /Regression schedules/);
  assert.match(html, /Daily portfolio regression/);
  assert.match(html, /Pause schedule/);

  const toggle = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/schedules/${schedule.id}/toggle`,
    {
      method: "POST",
      headers: browserHeaders,
      body: JSON.stringify({ enabled: false }),
    },
  ));
  assert.equal(toggle.status, 200);
  assert.equal((await toggle.json()).record.enabled, 0);

  const invalid = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/schedules", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      name: "Invalid duplicate",
      productIds: ["maxxed-remote", "maxxed-remote"],
      runnerId: "schedule-runner",
      deviceId: "schedule-device",
      cadenceMinutes: 10,
    }),
  }));
  assert.equal(invalid.status, 400);

  await state.database.transaction((tx) => {
    tx.insert("automation_jobs", {
      id: "job-regression-baseline",
      product_id: "maxxed-remote",
      ordered_steps_json: JSON.stringify(["launch-smoke"]),
      device_id: "schedule-device",
      runner_id: "schedule-runner",
      lease_state: "completed",
      result_json: JSON.stringify({
        finalStatus: "pass",
        steps: [{ stepId: "launch-smoke", status: "pass", exitCode: 0 }],
      }),
      evidence_json: "[]",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    tx.insert("automation_jobs", {
      id: "job-regression-current",
      product_id: "maxxed-remote",
      ordered_steps_json: JSON.stringify(["launch-smoke"]),
      device_id: "schedule-device",
      runner_id: "schedule-runner",
      lease_state: "failed",
      result_json: JSON.stringify({
        finalStatus: "fail",
        steps: [{ stepId: "launch-smoke", status: "fail", exitCode: 1 }],
      }),
      evidence_json: "[]",
      created_at: "2026-02-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    });
  });
  const comparison = await app.fetch(new Request(
    "https://admin.techmaxxed.com/testing-functions/jobs/job-regression-current/comparison.json",
    { headers: authHeaders(email) },
  ));
  assert.equal(comparison.status, 200);
  const comparisonBody = await comparison.json();
  assert.equal(comparisonBody.baselineJobId, "job-regression-baseline");
  assert.equal(comparisonBody.summary.regressions, 1);
  assert.equal(comparisonBody.regressions[0].stepId, "launch-smoke");

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "test_schedule.create"), true);
  assert.equal(audit.some((event) => event.action_name === "test_schedule.dispatch"), true);
  assert.equal(audit.filter((event) => event.action_name === "automation_job.create").length >= 2, true);
  assert.equal(audit.some((event) => event.action_name === "test_schedule.update"), true);
});


test("automatic device pools assign compatible idle runners and preserve exact targets", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const email = "qa-lead@techmaxxed.com";
  const boot = await bootstrap(email, "/testing-functions", app, state);
  const browserHeaders = {
    ...authHeaders(email),
    cookie: boot.cookie,
    origin: "https://admin.techmaxxed.com",
    "content-type": "application/json",
    "x-csrf-token": boot.csrfToken,
  };
  const queue = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      productIds: ["maxxed-remote", "maxxed-compass", "rival-rush"],
      runnerId: "auto",
      deviceId: "auto",
    }),
  }));
  assert.equal(queue.status, 200);
  const queued = (await queue.json()).records;
  assert.equal(queued.every((job) => job.runner_id === "auto" && job.device_id === "auto"), true);
  assert.equal(queued.every((job) => JSON.parse(job.result_json).targetMode === "pool"), true);

  const claim = (runnerId, deviceId, productIds) => app.fetch(new Request(
    "https://admin.techmaxxed.com/runner/jobs/claim",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ runnerId, deviceId, productIds, agentVersion: "2.2.0" }),
    },
  ));
  const runnerAClaim = await claim("pool-runner-a", "pool-device-a", ["maxxed-remote", "maxxed-compass"]);
  assert.equal(runnerAClaim.status, 200);
  const runnerAJob = (await runnerAClaim.json()).record;
  assert.equal(runnerAJob.product_id, "maxxed-remote");
  assert.equal(runnerAJob.runner_id, "pool-runner-a");
  assert.equal(runnerAJob.device_id, "pool-device-a");
  assert.equal(JSON.parse(runnerAJob.result_json).targetMode, "pool");

  const busyClaim = await claim("pool-runner-a", "pool-device-a", ["maxxed-remote", "maxxed-compass"]);
  assert.equal(busyClaim.status, 409);
  assert.equal((await busyClaim.json()).error, "runner_capacity_conflict:device_busy");

  const runnerBClaim = await claim("pool-runner-b", "pool-device-b", ["rival-rush"]);
  assert.equal(runnerBClaim.status, 200);
  assert.equal((await runnerBClaim.json()).record.product_id, "rival-rush");

  const completeA = await app.fetch(new Request(
    `https://admin.techmaxxed.com/runner/jobs/${runnerAJob.id}/complete`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${identityEnv.RUNNER_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        runnerId: "pool-runner-a",
        deviceId: "pool-device-a",
        productIds: ["maxxed-remote", "maxxed-compass"],
        status: "completed",
        result: { finalStatus: "pass", steps: [] },
        evidence: [],
      }),
    },
  ));
  assert.equal(completeA.status, 200);
  assert.equal(JSON.parse((await completeA.json()).record.result_json).targetMode, "pool");

  const runnerASecond = await claim("pool-runner-a", "pool-device-a", ["maxxed-remote", "maxxed-compass"]);
  assert.equal(runnerASecond.status, 200);
  assert.equal((await runnerASecond.json()).record.product_id, "maxxed-compass");

  const exactQueue = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      productIds: ["fishing-maxxed"],
      runnerId: "exact-runner",
      deviceId: "exact-device",
    }),
  }));
  assert.equal(exactQueue.status, 200);
  const wrongExactClaim = await claim("other-runner", "other-device", ["fishing-maxxed"]);
  assert.equal(wrongExactClaim.status, 404);
  const exactClaim = await claim("exact-runner", "exact-device", ["fishing-maxxed"]);
  assert.equal(exactClaim.status, 200);
  assert.equal((await exactClaim.json()).record.runner_id, "exact-runner");

  const mixedTarget = await app.fetch(new Request("https://admin.techmaxxed.com/testing-functions/jobs/batch", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({
      productIds: ["maxxed-remote"],
      runnerId: "auto",
      deviceId: "specific-device",
    }),
  }));
  assert.equal(mixedTarget.status, 400);

  const completedPoolJob = (await state.database.transaction((tx) => tx.list("automation_jobs")))
    .find((job) => job.id === runnerAJob.id);
  const retry = await app.fetch(new Request(
    `https://admin.techmaxxed.com/testing-functions/jobs/${completedPoolJob.id}/retry`,
    { method: "POST", headers: browserHeaders, body: "{}" },
  ));
  assert.equal(retry.status, 200);
  const retryRecord = (await retry.json()).record;
  assert.equal(retryRecord.runner_id, "auto");
  assert.equal(retryRecord.device_id, "auto");

  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.filter((event) => event.action_name === "automation_job.claim").length, 4);
});
