import { createSeededPlatformState } from "./dashboard/state.mjs";
import { renderAuditPage, renderPortfolioPage, renderRecordPage } from "./dashboard/renderers.mjs";
import { defaultAccessStore } from "./auth/access-store.mjs";
import { extractTrustedIdentity } from "./auth/identity.mjs";
import { createCsrfToken, createSession, readSession } from "./auth/session.mjs";
import { hasPermission, PERMISSIONS } from "./auth/roles.mjs";
import { loadPlatformConfig } from "./config.mjs";
import { appendSecurityHeaders, html, json, readCookie } from "./http.mjs";
import { createLogger } from "./logging.mjs";
import { NoopRateLimiter } from "./rate-limiters.mjs";
import { renderShell } from "./ui/layout.mjs";

const statePromise = createSeededPlatformState();

function denied(requestId, status, code) {
  return json({ error: code, requestId }, { status });
}

function makeRequestId() {
  return crypto.randomUUID();
}

function snapshotTx(database) {
  return {
    list(table) {
      return [...database.tables[table].values()].map((row) => structuredClone(row));
    },
    get(table, id) {
      return structuredClone(database.tables[table].get(id));
    },
  };
}

async function readBody(request, config) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > config.maxRequestBytes) {
    throw new Error("request_too_large");
  }
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  return request.json();
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
    ["GET", /^\/$/, { permission: PERMISSIONS.PRODUCTS_READ, handler: handlePortfolio }],
    ["GET", /^\/portfolio$/, { permission: PERMISSIONS.PRODUCTS_READ, handler: handlePortfolio }],
    ["GET", /^\/users$/, { permission: PERMISSIONS.USERS_READ, handler: handleUsers }],
    ["GET", /^\/analytics$/, { permission: PERMISSIONS.ANALYTICS_READ, handler: async ({ requestId }) => json({ ok: true, area: "analytics", requestId }) }],
    ["GET", /^\/releases$/, { permission: PERMISSIONS.RELEASES_PREPARE, handler: handleReleases }],
    ["GET", /^\/qa$/, { permission: PERMISSIONS.QA_EXECUTE, handler: handleQa }],
    ["GET", /^\/bugs$/, { permission: PERMISSIONS.QA_EXECUTE, handler: handleBugs }],
    ["GET", /^\/beta\/applications$/, { permission: PERMISSIONS.BETA_REVIEW, handler: handleBetaApplications }],
    ["GET", /^\/automation$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleAutomation }],
    ["GET", /^\/incidents$/, { permission: PERMISSIONS.ANALYTICS_READ, handler: handleIncidents }],
    ["GET", /^\/security\/audit$/, { permission: PERMISSIONS.AUDIT_READ, handler: handleSecurityAudit }],
    ["GET", /^\/knowledge-base$/, { permission: PERMISSIONS.DOCS_EDIT, handler: handleKnowledgeBase }],
    ["GET", /^\/readiness$/, { permission: PERMISSIONS.ANALYTICS_READ, handler: handleReadiness }],
    ["GET", /^\/beta\/portal$/, { permission: PERMISSIONS.BETA_PORTAL, handler: handleBetaPortal }],
    ["GET", /^\/docs\/editor$/, { permission: PERMISSIONS.DOCS_EDIT, handler: handleDocsEditor }],
    ["POST", /^\/products$/, { permission: PERMISSIONS.PRODUCTS_WRITE, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "product-updated", requestId }) }],
    ["POST", /^\/releases\/approve-qa$/, { permission: PERMISSIONS.RELEASES_APPROVE_QA, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "qa-approved", requestId }) }],
    ["POST", /^\/releases\/promote-production$/, { permission: PERMISSIONS.RELEASES_PROMOTE_PRODUCTION, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "production-promotion-approved", requestId }) }],
    ["POST", /^\/beta\/applications\/review$/, { permission: PERMISSIONS.BETA_REVIEW, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "beta-reviewed", requestId }) }],
    ["POST", /^\/docs\/publish$/, { permission: PERMISSIONS.DOCS_PUBLISH, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "docs-published", requestId }) }],
    ["POST", /^\/qa\/executions$/, { permission: PERMISSIONS.QA_EXECUTE, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "qa-executed", requestId }) }],
    ["POST", /^\/support\/cases$/, { permission: PERMISSIONS.SUPPORT_CASES, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "support-updated", requestId }) }],
    ["POST", /^\/beta\/portal\/feedback$/, { permission: PERMISSIONS.BETA_PORTAL, csrf: true, handler: async ({ requestId }) => json({ ok: true, action: "beta-feedback-recorded", requestId }) }],
  ];
}

async function renderDashboardPage({ title, identity, csrfToken, content }) {
  return html(renderShell({ title, identity, csrfToken, content }));
}

async function handlePortfolio({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Operations Overview",
    identity,
    csrfToken,
    content: renderPortfolioPage({
      products: tx.list("products"),
      builds: tx.list("builds"),
      releases: tx.list("releases"),
      readiness: tx.list("readiness_snapshots"),
    }),
  });
}

async function handleUsers({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "User and Role Administration",
    identity,
    csrfToken,
    content: renderRecordPage("Assigned roles", "Access control", tx.list("role_assignments"), (row) => `${row.role_name} for ${row.user_id}`),
  });
}

async function handleReleases({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Releases",
    identity,
    csrfToken,
    content: renderRecordPage("Release approvals", "Promotion gates", tx.list("releases"), (row) => `${row.stage} with owner ${row.owner_approval_state}`),
  });
}

async function handleQa({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "QA Plans and Executions",
    identity,
    csrfToken,
    content: `${renderRecordPage("QA plans", "Assignments", tx.list("qa_plans"), (row) => `${row.version_label}`)}${renderRecordPage("Executions", "Evidence", tx.list("qa_executions"), (row) => `${row.assignee_email} => ${row.result_state}`)}`,
  });
}

async function handleBugs({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Bug Tracking",
    identity,
    csrfToken,
    content: renderRecordPage("Bugs", "Verification", tx.list("bugs"), (row) => `${row.severity} ${row.status} owned by ${row.owner_email}`),
  });
}

async function handleBetaApplications({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Beta Applications",
    identity,
    csrfToken,
    content: renderRecordPage("Tester queue", "Review state", tx.list("beta_applications"), (row) => `${row.email} => ${row.status}`),
  });
}

async function handleAutomation({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Automation Jobs",
    identity,
    csrfToken,
    content: renderRecordPage("Sequential jobs", "Leases", tx.list("automation_jobs"), (row) => `${row.runner_id} on ${row.device_id} => ${row.lease_state}`),
  });
}

async function handleIncidents({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Incidents and Health",
    identity,
    csrfToken,
    content: `${renderRecordPage("Incidents", "Severity", tx.list("incidents"), (row) => `${row.severity} => ${row.status}`)}${renderRecordPage("Integration state", "Freshness", tx.list("integration_states"), (row) => `${row.monitor_name} => ${row.freshness_state}`)}`,
  });
}

async function handleSecurityAudit({ identity, csrfToken }) {
  const { database, services } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Security Events and Audit Log",
    identity,
    csrfToken,
    content: `${renderAuditPage(services.auditRepository.list(tx))}`,
  });
}

async function handleKnowledgeBase({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Knowledge Base",
    identity,
    csrfToken,
    content: renderRecordPage("Runbooks", "Publication state", tx.list("knowledge_base_entries"), (row) => `${row.title} => ${row.publication_state}`),
  });
}

async function handleReadiness({ identity, csrfToken }) {
  const { database } = await statePromise;
  const tx = snapshotTx(database);
  return renderDashboardPage({
    title: "Readiness Score",
    identity,
    csrfToken,
    content: renderRecordPage("Snapshots", "Mandatory gates", tx.list("readiness_snapshots"), (row) => `Score ${row.score}`),
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

export function createPlatformApp(options = {}) {
  const accessStore = options.accessStore || defaultAccessStore;
  const logger = options.logger || createLogger(options.logSink);
  const authRateLimiter = options.authRateLimiter || new NoopRateLimiter();
  const publicRateLimiter = options.publicRateLimiter || new NoopRateLimiter();
  const routes = routeTable();

  return {
    async fetch(request, env = {}) {
      const config = loadPlatformConfig({ ...env, ...(options.env || {}) });
      const requestId = makeRequestId();
      const url = new URL(request.url);
      const route = routes.find(([method, pattern]) => method === request.method && pattern.test(url.pathname));

      if (!route) {
        return appendSecurityHeaders(denied(requestId, 404, "not_found"), requestId, url.protocol === "https:");
      }

      const [, , meta] = route;

      if (meta.public) {
        const response = await meta.handler({ requestId, request });
        return appendSecurityHeaders(response, requestId, url.protocol === "https:");
      }

      await authRateLimiter.consume("auth", request.headers.get("cf-connecting-ip") || "local");
      const identity = extractTrustedIdentity(request, config, accessStore);
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

      const sessionToken = await createSession(identity, config);
      const session = await readSession(readCookie(request, "__Host-maxxed-session") || sessionToken, config);
      const csrfToken = await createCsrfToken(session, config);

      if (request.method !== "GET") {
        await publicRateLimiter.consume("mutation", identity.email);
        if (!requireOrigin(request)) {
          logger.log({ requestId, route: url.pathname, outcome: "invalid_origin", actor: identity.email });
          return appendSecurityHeaders(denied(requestId, 403, "invalid_origin"), requestId, url.protocol === "https:");
        }
        const presentedCsrf = request.headers.get("x-csrf-token");
        if (meta.csrf && presentedCsrf !== csrfToken) {
          logger.log({ requestId, route: url.pathname, outcome: "invalid_csrf", actor: identity.email });
          return appendSecurityHeaders(denied(requestId, 403, "invalid_csrf"), requestId, url.protocol === "https:");
        }
        try {
          await readBody(request, config);
        } catch (error) {
          const code = error.message === "request_too_large" ? "request_too_large" : "invalid_json";
          return appendSecurityHeaders(denied(requestId, 413, code), requestId, url.protocol === "https:");
        }
      }

      const response = await meta.handler({ requestId, request, identity, csrfToken });
      response.headers.set("set-cookie", `__Host-maxxed-session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`);
      return appendSecurityHeaders(response, requestId, url.protocol === "https:");
    },
  };
}
