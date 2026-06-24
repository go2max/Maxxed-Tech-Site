import { createSeededPlatformState } from "./dashboard/state.mjs";
import { renderAuditPage, renderPortfolioPage, renderRecordPage, renderTestingFunctionsPage, renderTestingJobPage } from "./dashboard/renderers.mjs";
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
import { getTestingProduct, requireTestingProducts, TESTING_PRODUCTS } from "./testing/catalog.mjs";
import { MemoryEvidenceStore, R2EvidenceStore, UnavailableEvidenceStore } from "./evidence/storage.mjs";

const stateCache = new WeakMap();
const evidenceStoreCache = new WeakMap();

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

async function readBinaryBody(request, maximumBytes) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error("evidence_too_large");
  const reader = request.body?.getReader?.();
  if (!reader) {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > maximumBytes) throw new Error("evidence_too_large");
    return bytes;
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) throw new Error("evidence_too_large");
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveEvidenceStore(options, env, config) {
  if (options.evidenceStore) return options.evidenceStore;
  const binding = env.PLATFORM_EVIDENCE || options.env?.PLATFORM_EVIDENCE;
  if (binding) return new R2EvidenceStore(binding);
  if (config.isTest || config.appEnv === "development") {
    if (!evidenceStoreCache.has(options)) evidenceStoreCache.set(options, new MemoryEvidenceStore());
    return evidenceStoreCache.get(options);
  }
  return new UnavailableEvidenceStore();
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
    ["POST", /^\/runner\/jobs\/[^/]+\/heartbeat$/, { runner: true, handler: heartbeatRunnerJob }],
    ["POST", /^\/runner\/jobs\/[^/]+\/complete$/, { runner: true, handler: completeRunnerJob }],
    ["PUT", /^\/runner\/jobs\/[^/]+\/evidence\/[^/]+$/, { runnerBinary: true, handler: uploadRunnerEvidence }],
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
    ["GET", /^\/testing-functions\/jobs\/[^/]+\/result\.json$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleTestingJobResult }],
    ["GET", /^\/testing-functions\/jobs\/[^/]+\/evidence\/[^/]+$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleTestingEvidenceDownload }],
    ["GET", /^\/testing-functions\/jobs\/[^/]+$/, { permission: PERMISSIONS.QA_ASSIGN, handler: handleTestingJobDetail }],
    ["POST", /^\/testing-functions\/jobs\/batch$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: mutateTestingBatch }],
    ["POST", /^\/testing-functions\/evidence\/purge$/, { permission: PERMISSIONS.SECURITY_MANAGE, csrf: true, handler: purgeExpiredEvidence }],
    ["POST", /^\/testing-functions\/jobs\/[^/]+\/cancel$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: cancelTestingJob }],
    ["POST", /^\/testing-functions\/jobs\/[^/]+\/retry$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: retryTestingJob }],
    ["POST", /^\/testing-functions\/maxxed-remote\/run$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: mutateRemoteTestJob }],
    ["POST", /^\/testing-functions\/maxxed-remote\/jobs\/[^/]+\/cancel$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: cancelTestingJob }],
    ["POST", /^\/testing-functions\/maxxed-remote\/jobs\/[^/]+\/retry$/, { permission: PERMISSIONS.QA_ASSIGN, csrf: true, handler: retryTestingJob }],
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

async function runnerTokenMatches(authorization, config, runnerId) {
  if (!authorization?.startsWith("Bearer ")) return false;
  const configuredRunnerIds = Object.keys(config.runnerApiTokens);
  const expectedTokens = configuredRunnerIds.length > 0
    ? config.runnerApiTokens[runnerId]
    : config.runnerApiToken ? [config.runnerApiToken] : null;
  if (!expectedTokens?.length) return false;
  const presented = authorization.slice("Bearer ".length);
  const encoder = new TextEncoder();
  const presentedHash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(presented)));
  const expectedHashes = await Promise.all(expectedTokens.map(async (token) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token)))
  ));
  let anyMatch = 0;
  for (const expected of expectedHashes) {
    let difference = expected.length ^ presentedHash.length;
    for (let index = 0; index < Math.max(expected.length, presentedHash.length); index += 1) {
      difference |= (expected[index] || 0) ^ (presentedHash[index] || 0);
    }
    anyMatch |= Number(difference === 0);
  }
  return anyMatch !== 0;
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


async function handleTestingFunctions({ identity, csrfToken, state, config }) {
  const approvedProductIds = new Set(TESTING_PRODUCTS.map((product) => product.id));
  const jobs = (await snapshot(state, "automation_jobs"))
    .filter((job) => approvedProductIds.has(job.product_id));
  const runners = await snapshot(state, "runner_nodes");
  return renderDashboardPage({
    title: "Testing Functions",
    identity,
    csrfToken,
    content: renderTestingFunctionsPage({
      products: TESTING_PRODUCTS,
      jobs,
      runners,
      fleetStaleMs: config.runnerFleetStaleMs,
      fleetOfflineMs: config.runnerFleetOfflineMs,
    }),
  });
}

async function handleTestingFunctionsScript() {
  return new Response(`const status = document.querySelector("#testing-status");
const csrfToken = () => document.querySelector("[data-csrf-token]")?.textContent || "";
const runnerId = () => document.querySelector("[name=runnerId]")?.value || "";
const deviceId = () => document.querySelector("[name=deviceId]")?.value || "";

async function post(path, body = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken(),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

async function queueProducts(productIds) {
  status.textContent = "Queueing " + productIds.length + " approved app test(s)...";
  const result = await post("/testing-functions/jobs/batch", {
    productIds,
    runnerId: runnerId(),
    deviceId: deviceId(),
  });
  status.textContent = "Queued " + result.records.length + " job(s). Refreshing...";
  window.setTimeout(() => location.reload(), 500);
}

document.querySelector("#portfolio-test-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const productIds = [...event.currentTarget.querySelectorAll("[name=productId]:checked")].map((input) => input.value);
  const button = event.currentTarget.querySelector("[type=submit]");
  button.disabled = true;
  try {
    await queueProducts(productIds);
  } catch (error) {
    status.textContent = "Could not queue tests: " + error.message;
    button.disabled = false;
  }
});

document.querySelectorAll("[data-run-product]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await queueProducts([button.dataset.runProduct]);
    } catch (error) {
      status.textContent = "Could not queue test: " + error.message;
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-job-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.jobAction;
    const jobId = button.dataset.jobId;
    const verb = action === "cancel" ? "Cancel" : "Retry";
    if (!window.confirm(verb + " job " + jobId + "?")) return;
    button.disabled = true;
    status.textContent = verb + " request in progress...";
    try {
      const result = await post("/testing-functions/jobs/" + encodeURIComponent(jobId) + "/" + action);
      const record = result.record;
      status.textContent = verb + " accepted for " + record.id + ". Refreshing...";
      window.setTimeout(() => location.reload(), 500);
    } catch (error) {
      status.textContent = verb + " failed: " + error.message;
      button.disabled = false;
    }
  });
});

function applyFilters() {
  const product = document.querySelector("[name=historyProduct]")?.value || "";
  const state = document.querySelector("[name=historyState]")?.value || "";
  document.querySelectorAll("[data-history-job]").forEach((row) => {
    row.hidden = Boolean((product && row.dataset.product !== product) || (state && row.dataset.state !== state));
  });
}
document.querySelector("[name=historyProduct]")?.addEventListener("change", applyFilters);
document.querySelector("[name=historyState]")?.addEventListener("change", applyFilters);

window.setInterval(() => {
  const editing = document.activeElement?.matches?.("input, select, button");
  const busy = document.querySelector("button:disabled");
  if (document.visibilityState === "visible" && !editing && !busy) location.reload();
}, 30000);`, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function createTestingJobs({ requestId, identity, state }, payload) {
  const runnerId = String(payload.runnerId || "");
  const deviceId = String(payload.deviceId || "");
  const safeId = /^[A-Za-z0-9._:-]{1,80}$/;
  if (!safeId.test(runnerId)) throw new Error("invalid_runner_id");
  if (!safeId.test(deviceId)) throw new Error("invalid_device_id");
  const products = requireTestingProducts(payload.productIds);
  const records = [];
  for (const product of products) {
    records.push(await state.services.createAutomationJob({ actor: identity, requestId }, {
      productId: product.id,
      orderedSteps: [...product.orderedSteps],
      deviceId,
      runnerId,
      leaseState: "queued",
      result: { packageId: product.packageId },
      evidence: [],
    }));
  }
  return records;
}

async function mutateTestingBatch(context) {
  const records = await createTestingJobs(context, context.payload);
  return json({ ok: true, records });
}

async function mutateRemoteTestJob(context) {
  const records = await createTestingJobs(context, {
    ...context.payload,
    productIds: ["maxxed-remote"],
  });
  return ok(records[0]);
}

async function resolveApprovedTestingJob(state, jobId) {
  const job = (await snapshot(state, "automation_jobs")).find((record) => record.id === jobId);
  if (!job || !getTestingProduct(job.product_id)) throw new Error("missing_row:automation_job");
  return job;
}

function testingJobExport(job) {
  const orderedSteps = parseStoredJson(job.ordered_steps_json, []);
  const result = parseStoredJson(job.result_json, {});
  const evidence = parseStoredJson(job.evidence_json, []);
  return {
    id: job.id,
    productId: job.product_id,
    runnerId: job.runner_id,
    deviceId: job.device_id,
    state: job.lease_state,
    orderedSteps: Array.isArray(orderedSteps) ? orderedSteps : [],
    result: result && typeof result === "object" && !Array.isArray(result) ? result : {},
    evidence: Array.isArray(evidence) ? evidence : [],
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
}

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function handleTestingJobDetail({ identity, csrfToken, request, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-1));
  const job = await resolveApprovedTestingJob(state, jobId);
  const evidenceObjects = (await snapshot(state, "test_evidence_objects"))
    .filter((record) => record.job_id === jobId && record.storage_state === "available");
  return renderDashboardPage({
    title: "Test Job Detail",
    identity,
    csrfToken,
    content: renderTestingJobPage({
      product: getTestingProduct(job.product_id),
      job: testingJobExport(job),
      evidenceObjects,
    }),
  });
}

async function handleTestingEvidenceDownload({ request, state, evidenceStore }) {
  const parts = new URL(request.url).pathname.split("/");
  const jobId = decodeURIComponent(parts.at(-3));
  const evidenceId = decodeURIComponent(parts.at(-1));
  await resolveApprovedTestingJob(state, jobId);
  const metadata = (await snapshot(state, "test_evidence_objects"))
    .find((record) => record.id === evidenceId && record.job_id === jobId && record.storage_state === "available");
  if (!metadata) throw new Error("missing_row:test_evidence_object");
  const object = await evidenceStore.get(metadata.object_key);
  if (!object) throw new Error("missing_row:test_evidence_object");
  const digest = await sha256Hex(object.body);
  if (object.body.byteLength !== metadata.byte_size || digest !== metadata.sha256) {
    throw new Error("evidence_integrity_failed");
  }
  const filename = metadata.artifact_name.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(object.body, {
    headers: {
      "content-type": metadata.content_type,
      "content-length": String(metadata.byte_size),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-content-sha256": metadata.sha256,
    },
  });
}

async function purgeExpiredEvidence({ requestId, identity, state, evidenceStore }) {
  const now = new Date().toISOString();
  const expired = (await snapshot(state, "test_evidence_objects"))
    .filter((record) => record.storage_state === "available" && record.retention_until <= now)
    .sort((left, right) => left.retention_until.localeCompare(right.retention_until))
    .slice(0, 100);
  const records = [];
  for (const record of expired) {
    await evidenceStore.delete(record.object_key);
    records.push(await state.services.deleteEvidenceObject({ actor: identity, requestId }, {
      evidenceId: record.id,
    }));
  }
  return json({ ok: true, purged: records.length, records });
}

async function handleTestingJobResult({ request, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  const job = await resolveApprovedTestingJob(state, jobId);
  return json(testingJobExport(job), {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${job.id.replace(/[^A-Za-z0-9._-]/g, "_")}-result.json"`,
    },
  });
}

async function cancelTestingJob({ requestId, request, identity, payload, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  const job = await resolveApprovedTestingJob(state, jobId);
  return ok(await state.services.cancelAutomationJob({ actor: identity, requestId }, {
    jobId,
    productId: job.product_id,
    reason: payload.reason,
  }));
}

async function retryTestingJob({ requestId, request, identity, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  const job = await resolveApprovedTestingJob(state, jobId);
  return ok(await state.services.retryAutomationJob({ actor: identity, requestId }, {
    jobId,
    productId: job.product_id,
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

async function claimRunnerJob({ requestId, identity, payload, state, config }) {
  await state.services.recordRunnerHeartbeat({ actor: identity, requestId }, payload);
  await state.services.expireAutomationLeases({ actor: identity, requestId }, {
    runnerId: payload.runnerId,
    deviceId: payload.deviceId,
    cutoff: new Date(Date.now() - config.runnerLeaseTtlMs).toISOString(),
  });
  return ok(await state.services.claimAutomationJob({ actor: identity, requestId }, payload));
}

async function heartbeatRunnerJob({ requestId, request, identity, payload, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  const job = await state.services.heartbeatAutomationJob({ actor: identity, requestId }, {
    ...payload,
    jobId,
  });
  await state.services.recordRunnerHeartbeat({ actor: identity, requestId }, {
    runnerId: payload.runnerId,
    deviceId: job.device_id,
    productIds: payload.productIds ?? [job.product_id],
    agentVersion: payload.agentVersion,
  });
  return ok(job);
}

async function uploadRunnerEvidence({ requestId, request, identity, state, config, evidenceStore, runnerId }) {
  const parts = new URL(request.url).pathname.split("/");
  const jobId = decodeURIComponent(parts.at(-3));
  const artifactName = decodeURIComponent(parts.at(-1));
  const stepId = String(request.headers.get("x-maxxed-step-id") || "");
  const contentType = String(request.headers.get("content-type") || "application/octet-stream")
    .split(";", 1)[0].trim().toLowerCase();
  const allowedTypes = new Set([
    "image/png", "image/jpeg", "text/plain", "application/json",
    "application/xml", "text/xml", "video/mp4", "application/octet-stream",
  ]);
  if (!allowedTypes.has(contentType)) throw new Error("invalid_evidence_content_type");
  const prepared = await state.services.prepareEvidenceUpload({ actor: identity, requestId }, {
    jobId, runnerId, stepId, artifactName,
  });
  const bytes = await readBinaryBody(request, config.evidenceMaxBytes);
  if (bytes.byteLength === 0) throw new Error("invalid_evidence_body");
  const sha256 = await sha256Hex(bytes);
  const retentionUntil = new Date(Date.now() + config.evidenceRetentionDays * 86_400_000).toISOString();
  await evidenceStore.put(prepared.objectKey, bytes, {
    contentType,
    customMetadata: { jobId, stepId, sha256 },
  });
  try {
    const record = await state.services.recordEvidenceObject({ actor: identity, requestId }, {
      ...prepared,
      runnerId,
      contentType,
      byteSize: bytes.byteLength,
      sha256,
      retentionUntil,
    });
    return ok({
      id: record.id,
      jobId: record.job_id,
      stepId: record.step_id,
      artifactName: record.artifact_name,
      contentType: record.content_type,
      byteSize: record.byte_size,
      sha256: record.sha256,
      retentionUntil: record.retention_until,
      ref: `evidence:${record.id}`,
    });
  } catch (error) {
    await evidenceStore.delete(prepared.objectKey);
    throw error;
  }
}

async function completeRunnerJob({ requestId, request, identity, payload, state }) {
  const jobId = decodeURIComponent(new URL(request.url).pathname.split("/").at(-2));
  const job = await state.services.completeAutomationJob({ actor: identity, requestId }, {
    ...payload,
    jobId,
  });
  await state.services.recordRunnerHeartbeat({ actor: identity, requestId }, {
    runnerId: payload.runnerId,
    deviceId: job.device_id,
    productIds: payload.productIds ?? [job.product_id],
    agentVersion: payload.agentVersion,
  });
  return ok(job);
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

      if (meta.runnerBinary) {
        const runnerId = String(request.headers.get("x-maxxed-runner-id") || "").trim();
        if (!/^[A-Za-z0-9._:-]{1,80}$/.test(runnerId) ||
            !(await runnerTokenMatches(request.headers.get("authorization"), config, runnerId))) {
          logger.log({ requestId, route: url.pathname, outcome: "runner_authentication_failed" });
          return appendSecurityHeaders(denied(requestId, 401, "runner_authentication_required"), requestId, url.protocol === "https:");
        }
        try {
          const resolvedEnv = { ...env, ...(options.env || {}) };
          const state = await resolveState(options, resolvedEnv);
          const evidenceStore = resolveEvidenceStore(options, resolvedEnv, config);
          const response = await meta.handler({
            requestId, request, identity: runnerActor(runnerId), state, config, evidenceStore, runnerId,
          });
          return appendSecurityHeaders(response, requestId, url.protocol === "https:");
        } catch (error) {
          logger.log({ requestId, route: url.pathname, actor: runnerId, outcome: "runner_evidence_failed", error: error.message });
          const status = error.message === "evidence_too_large" ? 413
            : error.message === "evidence_store_unavailable" ? 503
              : error.message.startsWith("forbidden:") ? 403
                : error.message.startsWith("missing_row:") ? 404
                  : error.message.startsWith("invalid_") ? 400
                    : 500;
          return appendSecurityHeaders(denied(requestId, status, error.message), requestId, url.protocol === "https:");
        }
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
            !(await runnerTokenMatches(request.headers.get("authorization"), config, runnerId))) {
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
            config,
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
        const evidenceStore = resolveEvidenceStore(options, { ...env, ...(options.env || {}) }, config);
        const response = await meta.handler({ requestId, request, identity, csrfToken, payload, state, config, evidenceStore });
        response.headers.set("set-cookie", `__Host-maxxed-session=${nextSessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`);
        return appendSecurityHeaders(response, requestId, url.protocol === "https:");
      } catch (error) {
        logger.log({ requestId, route: url.pathname, actor: identity.email, outcome: "mutation_failed", error: error.message });
        const status = error.message.startsWith("forbidden:") ? 403
          : error.message.startsWith("missing_row:") ? 404
            : error.message.startsWith("release_gate_failed:") ||
                error.message.startsWith("job_state_conflict:") ||
                error.message.startsWith("evidence_state_conflict:") ||
                error.message === "evidence_integrity_failed" ? 409
              : error.message === "evidence_store_unavailable" ? 503
                : error.message.startsWith("invalid_") ? 400
                  : 500;
        return appendSecurityHeaders(denied(requestId, status, error.message), requestId, url.protocol === "https:");
      }
    },
  };
}
