import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { createPlatformApp } from "../src/app.mjs";
import { createSeededPlatformState } from "../src/dashboard/state.mjs";
import { summarizeSecurityPosture } from "../src/monitoring/security.mjs";

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

async function session(app, email, path) {
  const response = await app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    headers: authHeaders(email),
  }));
  const body = await response.text();
  return {
    response,
    body,
    cookie: response.headers.get("set-cookie"),
    csrf: /<code data-csrf-token>([^<]+)<\/code>/.exec(body)?.[1],
  };
}

async function post(app, email, auth, path, payload) {
  return app.fetch(new Request(`https://admin.techmaxxed.com${path}`, {
    method: "POST",
    headers: authHeaders(email, {
      cookie: auth.cookie,
      origin: "https://admin.techmaxxed.com",
      "content-type": "application/json",
      "x-csrf-token": auth.csrf,
    }),
    body: JSON.stringify(payload),
  }));
}

test("security posture reports critical, degraded, and healthy states truthfully", () => {
  const now = Date.parse("2026-06-24T12:00:00.000Z");
  const base = {
    integrations: [{ id: "monitor", monitor_name: "website_uptime", product_id: "portfolio", freshness_state: "healthy", updated_at: "2026-06-24T11:00:00.000Z" }],
    backups: [{ id: "backup", storage_state: "verified", created_at: "2026-06-24T10:00:00.000Z", verified_at: "2026-06-24T10:05:00.000Z" }],
    auditValid: true,
    now,
  };
  assert.equal(summarizeSecurityPosture({ ...base, findings: [] }).state, "healthy");
  assert.equal(summarizeSecurityPosture({
    ...base,
    findings: [{ status: "open", severity: "high" }],
  }).state, "degraded");
  assert.equal(summarizeSecurityPosture({
    ...base,
    findings: [{ status: "open", severity: "critical" }],
  }).state, "critical");
  assert.equal(summarizeSecurityPosture({ ...base, findings: [], auditValid: false }).state, "critical");
  assert.equal(summarizeSecurityPosture({
    ...base,
    findings: [],
    integrations: [{ ...base.integrations[0], updated_at: "2026-06-20T00:00:00.000Z" }],
  }).unhealthyIntegrationCount, 1);
});

test("admin dashboard ingests monitor checks and deduplicated findings with audited resolution", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const admin = await session(app, "admin@techmaxxed.com", "/security/monitoring");
  assert.equal(admin.response.status, 200);
  assert.match(admin.body, /security-finding-form/);
  assert.match(admin.body, /monitoring-check-form/);
  assert.match(admin.body, /Audit chain: true/);

  const script = await app.fetch(new Request("https://admin.techmaxxed.com/security/monitoring.js", {
    headers: authHeaders("admin@techmaxxed.com"),
  }));
  assert.equal(script.status, 200);
  const scriptBody = await script.text();
  assert.doesNotThrow(() => new Function(scriptBody));
  assert.match(scriptBody, /data-finding-resolve/);
  assert.match(scriptBody, /x-csrf-token/);

  const check = await post(app, "admin@techmaxxed.com", admin, "/security/monitoring/checks", {
    monitorName: "certificate_expiry",
    freshnessState: "healthy",
    productId: "portfolio",
    details: { expiresAt: "2027-01-01T00:00:00.000Z", daysRemaining: 190 },
  });
  assert.equal(check.status, 200);

  const findingPayload = {
    fingerprint: "dependency:package:critical-1",
    source: "dependency_scan",
    category: "dependency",
    severity: "critical",
    status: "open",
    title: "<script>unsafe dependency</script>",
    details: { package: "example", advisory: "ADV-1" },
  };
  const first = await post(app, "admin@techmaxxed.com", admin, "/security/monitoring/findings", findingPayload);
  assert.equal(first.status, 200);
  const finding = (await first.json()).record;
  const second = await post(app, "admin@techmaxxed.com", admin, "/security/monitoring/findings", {
    ...findingPayload,
    severity: "high",
    title: "Updated dependency finding",
  });
  assert.equal(second.status, 200);
  assert.equal((await second.json()).record.id, finding.id);

  const page = await session(app, "admin@techmaxxed.com", "/security/monitoring");
  assert.doesNotMatch(page.body, /<script>unsafe dependency<\/script>/);
  assert.match(page.body, /Updated dependency finding/);

  const resolved = await post(app, "admin@techmaxxed.com", admin, `/security/monitoring/findings/${finding.id}/resolve`, {
    resolution: "Dependency upgraded and scanner rerun clean.",
  });
  assert.equal(resolved.status, 200);
  assert.equal((await resolved.json()).record.status, "resolved");

  const findings = await state.database.transaction((tx) => tx.list("security_findings"));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].status, "resolved");
  const monitors = await state.database.transaction((tx) => tx.list("integration_states"));
  assert.equal(monitors.some((item) => item.monitor_name === "certificate_expiry"), true);
  const audit = await state.database.transaction((tx) => tx.list("audit_events"));
  assert.equal(audit.some((event) => event.action_name === "monitoring_check.record"), true);
  assert.equal(audit.filter((event) => event.action_name === "security_finding.record").length, 2);
  assert.equal(audit.some((event) => event.action_name === "security_finding.resolve"), true);
});

test("read-only security roles cannot mutate monitoring state", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const qa = await session(app, "qa-lead@techmaxxed.com", "/security/monitoring");
  assert.equal(qa.response.status, 200);
  assert.doesNotMatch(qa.body, /security-finding-form/);

  const script = await app.fetch(new Request("https://admin.techmaxxed.com/security/monitoring.js", {
    headers: authHeaders("qa-lead@techmaxxed.com"),
  }));
  assert.equal(script.status, 403);

  const mutation = await post(app, "qa-lead@techmaxxed.com", qa, "/security/monitoring/checks", {
    monitorName: "website_uptime",
    freshnessState: "healthy",
    productId: "portfolio",
    details: {},
  });
  assert.equal(mutation.status, 403);
});


test("readiness UI records evidence, calculates snapshots, and keeps viewers read-only", async () => {
  const state = await createSeededPlatformState();
  const app = createPlatformApp({ env: identityEnv, state });
  const admin = await session(app, "admin@techmaxxed.com", "/readiness");
  assert.equal(admin.response.status, 200);
  assert.match(admin.body, /readiness-evidence-form/);
  assert.match(admin.body, /readiness-calculate-form/);

  const script = await app.fetch(new Request("https://admin.techmaxxed.com/readiness.js", {
    headers: authHeaders("admin@techmaxxed.com"),
  }));
  assert.equal(script.status, 200);
  const scriptBody = await script.text();
  assert.doesNotThrow(() => new Function(scriptBody));
  assert.match(scriptBody, /readiness\/evidence/);
  assert.match(scriptBody, /readiness\/calculate/);

  const product = (await state.database.transaction((tx) => tx.list("products")))[0];
  const evidence = await post(app, "admin@techmaxxed.com", admin, "/readiness/evidence", {
    productId: product.id,
    category: "buildIntegrity",
    resultState: "pass",
    source: "release pipeline",
    reference: "build:120",
    mandatoryGate: true,
    gateKey: "artifactBuild",
    expiresAt: "2027-06-24T00:00:00.000Z",
  });
  assert.equal(evidence.status, 200);
  const calculated = await post(app, "admin@techmaxxed.com", admin, "/readiness/calculate", {
    productId: product.id,
    stage: "internal_qa",
  });
  assert.equal(calculated.status, 200);
  const snapshot = (await calculated.json()).record;
  assert.equal(snapshot.score, 15);
  assert.equal(JSON.parse(snapshot.mandatory_gates_json).releaseState, "blocked");

  const updated = await session(app, "admin@techmaxxed.com", "/readiness");
  assert.match(updated.body, /Score 15/);
  assert.match(updated.body, /packageIdentity/);

  const viewer = await session(app, "analytics@techmaxxed.com", "/readiness");
  assert.equal(viewer.response.status, 200);
  assert.doesNotMatch(viewer.body, /readiness-evidence-form/);
  const forbidden = await post(app, "analytics@techmaxxed.com", viewer, "/readiness/calculate", {
    productId: product.id,
    stage: "internal_qa",
  });
  assert.equal(forbidden.status, 403);
});
