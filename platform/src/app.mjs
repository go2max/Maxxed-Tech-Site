import { createSeededPlatformState } from "./dashboard/state.mjs";
import { renderAuditPage, renderPortfolioPage, renderRecordPage, renderTestingFunctionsPage } from "./dashboard/renderers.mjs";
import { defaultAccessStore } from "./auth/access-store.mjs";
import { extractTrustedIdentity } from "./auth/identity.mjs";
import { createCsrfToken, createSession, readSession, sessionMatchesIdentity } from "./auth/session.mjs";
import { hasPermission, PERMISSIONS } from "./auth/roles.mjs";
import { loadPlatformConfig } from "./config.mjs";
import { appendSecurityHeaders, html, json, readCookie } from "./http.mjs";
import { createLogger } from "./logging.mjs";
import { MemoryRateLimiter } from "./rate-limiters.mjs";
import { applyAllMigrations } from "./persistence/migrations.mjs";
import { createPlatformDatabase } from "./persistence/database.mjs";
import { createPlatformServices } from "./persistence/services.mjs";
import { renderShell } from "./ui/layout.mjs";

const stateCache = new WeakMap();

function denied(requestId, status, code, details) {
  return json({ error: code, requestId, ...(details ? { details } : {}) }, { status });
}

function makeRequestId() {
  return crypto.randomUUID();
}

async function readBody(request, config) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  const reader = request.body?.getReader?.();
  if (!reader) {
    return request.json();
  }
  let total = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > config.maxRequestBytes) {
      throw new Error("request_too_large");
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new Error("invalid_json");
  }
}

function requireOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const url = new URL(request.url);
  return origin === url.origin;
}

function routeTable() {
  return [
    ["GET", /^\/health$/, { public: true, handler: async ({ requestId }) => json({ ok: true, service: "maxxed-private-platform", requestId }) }],
    ["POST", /^\/runner\/jobs\/claim$/, { runner: true, handler: claimRunnerJob }],
    ["POST", /^\/runner\/jobs\/[^/]+\/complete$/, { runner: true, handler: completeRunnerJob }],
    ["GET", /^\/$/, { permission: PERMISSIONS.PRODUCTS_READ, handler: handlePortfolio }],
    ["GET", /^\/portfolio$/, { permission: PERMISSIONS.PRODUCTS_READ, handler: handlePortfolio }],
    ["GET", /^\/users$/, { permission: PERMISSIONS.USERS_READ, handler: handleUsers }],
    ["GET", /^\/analytics$/, { permission: PERMISSIONS.ANALYTICS_READ, handler: async ({ requestId }) => json({ ok: true, area: "analytics", requestId }) }],
    ["GET", /^\/releases$/, { permission: PERMISSIONS.RELEASES_READ, handler: handleReleases }],
    ["GET", /^\/qa$/, { permission: PERMISSIONS.QA_READ, handler: handleQa }],
    ["GET", /^\/bugs$/, { permission: PERMISSIONS.QA_READ, handler: handleBugs }],
    ["GET", /^\/beta\/applications$/, { permission: PERMISSIONS.BETA_READ, handler: handleBetaApplications }],
    ["GET", /^\/automation$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleAutomation }],
    ["GET", /^\/testing-functions$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleTestingFunctions }],
    ["GET", /^\/testing-functions\.js$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleTestingFunctionsScript }],
    ["POST", /^\/testing-functions\/maxxed-remote\/run$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: mutateRemoteTestJob }],
    ["GET", /^\/incidents$/, { permission: PERMISSIONS.INCIDENTS_READ, handler: handleIncidents }],
    ["GET", /^\/security\/audit$/, { permission: PERMISSIONS.AUDIT_READ, handler: handleSecurityAudit }],
    ["GET", /^\/knowledge-base$/, { permission: PERMISSIONS.DOCS_READ, handler: handleKnowledgeBase }],
    ["GET", /^\/readiness$/, { permission: PERMISSIONS.READINESS_READ, handler: handleReadiness }],
    ["GET", /^\/beta\/portal$/, { permission: PERMISSIONS.BETA_PORTAL, handler: handleBetaPortal }],
    ["GET", /^\/docs\/editor$/, { permission: PERMISSIONS.DOCS_READ, handler: handleDocsEditor }],
    ["POST", /^\/products$/, { permission: PERMISSIONS.PRODUCTS_WRITE, csrf: true, handler: mutateProduct }],
    ["POST", /^\/releases\/approve-qa$/, { permission: PERMISSIONS.RELEASES_APPROVE_QA, csrf: true, handler: mutateReleaseQaApproval }],
    ["POST", /^\/releases\/promote-production$/, { permission: PERMISSIONS.RELEASES_PROMOTE_PRODUCTION, csrf: true, handler: mutateReleasePromotion }],
    ["POST", /^\/beta\/applications\/review$/, { permission: PERMISSIONS.BETA_REVIEW, csrf: true, handler: mutateBetaReview }],
    ["POST", /^\/docs\/publish$/, { permission: PERMISSIONS.DOCS_PUBLISH, csrf: true, handler: mutateDocsPublish }],
    ["POST", /^\/qa\/executions$/, { permission: PERMISSIONS.QA_EXECUTE, csrf: true, handler: mutateQaExecution }],
    ["POST", /^\/support\/cases$/, { permission: PERMISSIONS.SUPPORT_CASES, csrf: true, handler: mutateSupportCase }],
    ["POST", /^\/beta\/portal\/feedback$/, { permission: PERMISSIONS.BETA_PORTAL, csrf: true, handler: mutateBetaFeedback }],
  ];
}

async function runnerTokenMatches(authorization, expectedToken) {
  if (!expectedToken || !authorization?.startsWith("Bearer ")) return false;
  const presented = authorization.slice("Bearer ".length);
  const encoder = new TextEncoder();
  const [expectedHash, presentedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expectedToken)),
    crypto.subtle.digest("SHA-256", encoder.encode(presented)),
  ]);
  const expected = new Uint8Array(expectedHash);
  const received = new Uint8Array(presentedHash);
  let difference = expected.length ^ received.length;
  for (let index = 0; index < Math.max(expected.length, received.length); index += 1) {
    difference |= (expected[index] || 0) ^ (received[index] || 0);
  }
  return difference === 0;
}

function runnerActor(runnerId) {
  return {
    email: `${runnerId}@runner.internal`,
    displayName: runnerId,
    subject: `runner:${runnerId}`,
    roles: ["Runner"],
    permissions: new Set([PERMISSIONS.QA_EXECUTE]),
    isDevelopmentOverride: false,
  };
}

async function renderDashboardPage({ title, identity, csrfToken, content }) {
  return html(renderShell({ title, identity, csrfToken, content }));
}

async function snapshot(state, table) {
  return state.database.transaction((tx) => tx.list(table));
}

async function handlePortfolio({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Operations Overview",
    identity,
    csrfToken,
    content: renderPortfolioPage({
      products: await snapshot(state, "products"),
      builds: await snapshot(state, "builds"),
      releases: await snapshot(state, "releases"),
      readiness: await snapshot(state, "readiness_snapshots"),
    }),
  });
}

async function handleUsers({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "User and Role Administration",
    identity,
    csrfToken,
    content: renderRecordPage("Assigned roles", "Access control", await snapshot(state, "role_assignments"), (row) => `${row.role_name} for ${row.user_id}`),
  });
}

async function handleReleases({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Releases",
    identity,
    csrfToken,
    content: renderRecordPage("Release approvals", "Promotion gates", await snapshot(state, "releases"), (row) => `${row.stage} with owner ${row.owner_approval_state}`),
  });
}

async function handleQa({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "QA Plans and Executions",
    identity,
    csrfToken,
    content: `${renderRecordPage("QA plans", "Assignments", await snapshot(state, "qa_plans"), (row) => `${row.version_label}`)}${renderRecordPage("Executions", "Evidence", await snapshot(state, "qa_executions"), (row) => `${row.assignee_email} => ${row.result_state}`)}`,
  });
}

async function handleBugs({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Bug Tracking",
    identity,
    csrfToken,
    content: renderRecordPage("Bugs", "Verification", await snapshot(state, "bugs"), (row) => `${row.severity} ${row.status} owned by ${row.owner_email}`),
  });
}

async function handleBetaApplications({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Beta Applications",
    identity,
    csrfToken,
    content: renderRecordPage("Tester queue", "Review state", await snapshot(state, "beta_applications"), (row) => `${row.email} => ${row.status}`),
  });
}

async function handleAutomation({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Automation Jobs",
    identity,
    csrfToken,
    content: renderRecordPage("Sequential jobs", "Leases", await snapshot(state, "automation_jobs"), (row) => `${row.runner_id} on ${row.device_id} => ${row.lease_state}`),
  });
}


async function handleTestingFunctions({ identity, csrfToken, state }) {
  const jobs = (await snapshot(state, "automation_jobs"))
    .filter((job) => job.product_id === "maxxed-remote");
  return renderDashboardPage({
    title: "Testing Functions",
    identity,
    csrfToken,
    content: renderTestingFunctionsPage({ jobs }),
  });
}

async function handleTestingFunctionsScript() {
  return new Response(`const form = document.querySelector("#remote-test-form");
const status = document.querySelector("#remote-test-status");
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "Queueing approved Remote test...";
  const data = new FormData(form);
  try {
    const response = await fetch("/testing-functions/maxxed-remote/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": document.querySelector("[data-csrf-token]")?.textContent || "",
      },
      body: JSON.stringify({
        runnerId: data.get("runnerId"),
        deviceId: data.get("deviceId"),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "queue_failed");
    status.textContent = "Queued job " + result.record.id + ".";
  } catch (error) {
    status.textContent = "Could not queue test: " + error.message;
  } finally {
    button.disabled = false;
  }
});`, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function mutateRemoteTestJob({ requestId, identity, payload, state }) {
  const runnerId = String(payload.runnerId || "");
  const deviceId = String(payload.deviceId || "");
  const safeId = /^[A-Za-z0-9._:-]{1,80}$/;
  if (!safeId.test(runnerId)) throw new Error("invalid_runner_id");
  if (!safeId.test(deviceId)) throw new Error("invalid_device_id");
  return ok(await state.services.createAutomationJob({ actor: identity, requestId }, {
    productId: "maxxed-remote",
    orderedSteps: ["artifact-verify", "launch-smoke", "full-ux-connection"],
    deviceId,
    runnerId,
    leaseState: "queued",
    result: {},
    evidence: [],
  }));
}
async function handleIncidents({ identity, csrfToken, state }) {
  const incidentSection = hasPermission(identity, PERMISSIONS.INCIDENTS_READ)
    ? renderRecordPage("Incidents", "Severity", await snapshot(state, "incidents"), (row) => `${row.severity} => ${row.status}`)
    : "";
  const integrationSection = hasPermission(identity, PERMISSIONS.INTEGRATIONS_READ)
    ? renderRecordPage("Integration state", "Freshness", await snapshot(state, "integration_states"), (row) => `${row.monitor_name} => ${row.freshness_state}`)
    : "";
  return renderDashboardPage({
    title: "Incidents and Health",
    identity,
    csrfToken,
    content: `${incidentSection}${integrationSection || '<section class="card"><p class="empty-state">Integration state is not visible to this role.</p></section>'}`,
  });
}

async function handleSecurityAudit({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Security Events and Audit Log",
    identity,
    csrfToken,
    content: renderAuditPage(await snapshot(state, "audit_events")),
  });
}

async function handleKnowledgeBase({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Knowledge Base",
    identity,
    csrfToken,
    content: renderRecordPage("Runbooks", "Publication state", await snapshot(state, "knowledge_base_entries"), (row) => `${row.title} => ${row.publication_state}`),
  });
}

async function handleReadiness({ identity, csrfToken, state }) {
  return renderDashboardPage({
    title: "Readiness Score",
    identity,
    csrfToken,
    content: renderRecordPage("Snapshots", "Mandatory gates", await snapshot(state, "readiness_snapshots"), (row) => `Score ${row.score}`),
  });
}

async function handleBetaPortal({ identity, csrfToken }) {
  return renderDashboardPage({
    title: "Beta Tester Portal",
    identity,
    csrfToken,
    content: `<section class="card"><h2>Assigned testing work</h2><p>Portal-only users can view instructions and submit feedback without broader administrative access.</p></section>`,
  });
}

async function handleDocsEditor({ identity, csrfToken }) {
  return renderDashboardPage({
    title: "Documentation Workspace",
    identity,
    csrfToken,
    content: `<section class="card"><h2>Managed content</h2><p>Documentation editors can draft and publish approved internal and public content without broader administrative access.</p></section>`,
  });
}

function ok(data) {
  return json({ ok: true, record: data });
}

async function claimRunnerJob({ requestId, identity, payload, state }) {
  return ok(await state.services.claimAutomationJob({ actor: identity, requestId }, payload));
}

async function completeRunnerJob({ requestId, request, identity, payload, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  return ok(await state.services.completeAutomationJob({ actor: identity, requestId }, {
    ...payload,
    jobId,
  }));
}

async function mutateProduct({ requestId, identity, payload, state }) {
  return ok(await state.services.createProduct({ actor: identity, requestId }, payload));
}

async function mutateReleaseQaApproval({ requestId, identity, payload, state }) {
  return ok(await state.services.approveReleaseQa({ actor: identity, requestId }, payload));
}

async function mutateReleasePromotion({ requestId, identity, payload, state }) {
  return ok(await state.services.promoteReleaseToProduction({ actor: identity, requestId }, payload));
}

async function mutateBetaReview({ requestId, identity, payload, state }) {
  return ok(await state.services.reviewBetaApplication({ actor: identity, requestId }, payload));
}

async function mutateDocsPublish({ requestId, identity, payload, state }) {
  return ok(await state.services.publishKnowledgeBaseEntry({ actor: identity, requestId }, payload));
}

async function mutateQaExecution({ requestId, identity, payload, state }) {
  return ok(await state.services.recordQaExecution({ actor: identity, requestId }, payload));
}

async function mutateSupportCase({ requestId, identity, payload, state }) {
  return ok(await state.services.createSupportCase({ actor: identity, requestId }, payload));
}

async function mutateBetaFeedback({ requestId, identity, payload, state }) {
  return ok(await state.services.recordBetaFeedback({ actor: identity, requestId }, payload));
}

async function resolveState(options, env) {
  if (options.state) return options.state;
  if ((options.seedState === true || env.APP_ENV === "test") && !env.PLATFORM_DB && options.database == null) {
    if (!stateCache.has(options)) {
      stateCache.set(options, createSeededPlatformState());
    }
    return stateCache.get(options);
  }
  const cacheOwner = env.PLATFORM_DB || options;
  if (!stateCache.has(cacheOwner)) {
    stateCache.set(cacheOwner, (async () => {
      const database = createPlatformDatabase(env, options);
      await applyAllMigrations(database);
      const services = createPlatformServices(database);
      return { database, services, auditRepository: services.auditRepository };
    })());
  }
  return stateCache.get(cacheOwner);
}

export function createPlatformApp(options = {}) {
  const accessStore = options.accessStore || defaultAccessStore;
  const logger = options.logger || createLogger(options.logSink);
  const routes = routeTable();
  let authRateLimiter = options.authRateLimiter || null;
  let publicRateLimiter = options.publicRateLimiter || null;

  return {
    async fetch(request, env = {}) {
      const requestId = makeRequestId();
      const url = new URL(request.url);
      let config;
      try {
        config = loadPlatformConfig({ ...env, ...(options.env || {}) });
      } catch (error) {
        logger.log({ requestId, route: url.pathname, outcome: "misconfigured", error: error.message });
        return appendSecurityHeaders(denied(requestId, 500, "misconfigured"), requestId, url.protocol === "https:");
      }
      authRateLimiter ||= new MemoryRateLimiter({
        max: config.authRateLimitMax,
        windowMs: config.authRateLimitWindowMs,
      });
      publicRateLimiter ||= new MemoryRateLimiter({
        max: config.mutationRateLimitMax,
        windowMs: config.mutationRateLimitWindowMs,
      });
      const route = routes.find(([method, pattern]) => method === request.method && pattern.test(url.pathname));

      if (!route) {
        return appendSecurityHeaders(denied(requestId, 404, "not_found"), requestId, url.protocol === "https:");
      }

      const [, , meta] = route;

      if (meta.public) {
        const response = await meta.handler({ requestId, request });
        return appendSecurityHeaders(response, requestId, url.protocol === "https:");
      }

      if (meta.runner) {
        let payload;
        try {
          payload = await readBody(request, config);
        } catch (error) {
          const code = error.message === "request_too_large" ? "request_too_large" : "invalid_json";
          return appendSecurityHeaders(denied(requestId, code === "request_too_large" ? 413 : 400, code), requestId, url.protocol === "https:");
        }
        const runnerId = typeof payload.runnerId === "string" ? payload.runnerId.trim() : "";
        if (!/^[A-Za-z0-9._:-]{1,80}$/.test(runnerId) ||
            !(await runnerTokenMatches(request.headers.get("authorization"), config.runnerApiToken))) {
          logger.log({ requestId, route: url.pathname, outcome: "runner_authentication_failed" });
          return appendSecurityHeaders(denied(requestId, 401, "runner_authentication_required"), requestId, url.protocol === "https:");
        }
        let state;
        try {
          state = await resolveState(options, { ...env, ...(options.env || {}) });
          const response = await meta.handler({
            requestId,
            request,
            identity: runnerActor(runnerId),
            payload,
            state,
          });
          return appendSecurityHeaders(response, requestId, url.protocol === "https:");
        } catch (error) {
          logger.log({ requestId, route: url.pathname, actor: runnerId, outcome: "runner_request_failed", error: error.message });
          const status = error.message.startsWith("forbidden:") ? 403
            : error.message.startsWith("missing_row:") ? 404
              : error.message.startsWith("invalid_") ? 400
                : 500;
          return appendSecurityHeaders(denied(requestId, status, error.message), requestId, url.protocol === "https:");
        }
      }

      const identityKey = request.headers.get("cf-connecting-ip") || "local";
      try {
        await authRateLimiter.consume("auth", identityKey);
      } catch {
        return appendSecurityHeaders(denied(requestId, 429, "rate_limit_exceeded"), requestId, url.protocol === "https:");
      }

      let identity;
      try {
        identity = extractTrustedIdentity(request, config, accessStore);
      } catch (error) {
        logger.log({ requestId, route: url.pathname, outcome: "invalid_identity", error: error.message });
        return appendSecurityHeaders(denied(requestId, 401, "authentication_required"), requestId, url.protocol === "https:");
      }
      if (!identity) {
        logger.log({ requestId, route: url.pathname, outcome: "unauthenticated" });
        return appendSecurityHeaders(denied(requestId, 401, "authentication_required"), requestId, url.protocol === "https:");
      }

      const browserRoleHeader = request.headers.get("x-maxxed-role") || request.headers.get("x-maxxed-roles");
      if (browserRoleHeader) {
        logger.log({ requestId, route: url.pathname, outcome: "ignored_browser_role_claim", actor: identity.email, browserRoleHeader });
      }

      if (!hasPermission(identity, meta.permission)) {
        logger.log({ requestId, route: url.pathname, outcome: "forbidden", actor: identity.email });
        return appendSecurityHeaders(denied(requestId, 403, "forbidden"), requestId, url.protocol === "https:");
      }

      let state;
      try {
        state = await resolveState(options, { ...env, ...(options.env || {}) });
      } catch (error) {
        logger.log({ requestId, route: url.pathname, actor: identity.email, outcome: "misconfigured_state", error: error.message });
        return appendSecurityHeaders(denied(requestId, 500, "misconfigured"), requestId, url.protocol === "https:");
      }
      const presentedSession = readCookie(request, "__Host-maxxed-session");
      const existingSession = await readSession(presentedSession, config);
      const currentSession = existingSession && sessionMatchesIdentity(existingSession, identity) ? existingSession : null;

      if (request.method !== "GET") {
        try {
          await publicRateLimiter.consume("mutation", identity.email);
        } catch {
          return appendSecurityHeaders(denied(requestId, 429, "rate_limit_exceeded"), requestId, url.protocol === "https:");
        }
        if (!currentSession) {
          logger.log({ requestId, route: url.pathname, outcome: "missing_session", actor: identity.email });
          return appendSecurityHeaders(denied(requestId, 401, "session_required"), requestId, url.protocol === "https:");
        }
        if (!requireOrigin(request)) {
          logger.log({ requestId, route: url.pathname, outcome: "invalid_origin", actor: identity.email });
          return appendSecurityHeaders(denied(requestId, 403, "invalid_origin"), requestId, url.protocol === "https:");
        }
        const expectedCsrf = await createCsrfToken(currentSession, config);
        const presentedCsrf = request.headers.get("x-csrf-token");
        if (meta.csrf && presentedCsrf !== expectedCsrf) {
          logger.log({ requestId, route: url.pathname, outcome: "invalid_csrf", actor: identity.email });
          return appendSecurityHeaders(denied(requestId, 403, "invalid_csrf"), requestId, url.protocol === "https:");
        }
      }

      const nextSessionToken = await createSession(identity, config, Date.now(), currentSession);
      const nextSession = await readSession(nextSessionToken, config);
      const csrfToken = await createCsrfToken(nextSession, config);

      let payload = {};
      if (request.method !== "GET") {
        try {
          payload = await readBody(request, config);
        } catch (error) {
          const code = error.message === "request_too_large" ? "request_too_large" : "invalid_json";
          return appendSecurityHeaders(denied(requestId, code === "request_too_large" ? 413 : 400, code), requestId, url.protocol === "https:");
        }
      }

      try {
        const response = await meta.handler({ requestId, request, identity, csrfToken, payload, state });
        response.headers.set("set-cookie", `__Host-maxxed-session=${nextSessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`);
        return appendSecurityHeaders(response, requestId, url.protocol === "https:");
      } catch (error) {
        logger.log({ requestId, route: url.pathname, actor: identity.email, outcome: "mutation_failed", error: error.message });
        const status = error.message.startsWith("forbidden:") ? 403
          : error.message.startsWith("missing_row:") ? 404
            : error.message.startsWith("release_gate_failed:") ? 409
              : error.message.startsWith("invalid_") ? 400
                : 500;
        return appendSecurityHeaders(denied(requestId, status, error.message), requestId, url.protocol === "https:");
      }
    },
  };
}
