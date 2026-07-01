import { approvedCommandRefs } from "./build-recipes.js";

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const now = () => new Date().toISOString();
const leaseUntil = () => new Date(Date.now() + 300_000).toISOString();

async function requestJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function authorized(request, env) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = String(env.BUILD_RUNNER_TOKEN || env.RUNNER_TOKEN || "");
  if (!supplied || !expected) return false;
  const [left, right] = await Promise.all([sha256Hex(new TextEncoder().encode(supplied)), sha256Hex(new TextEncoder().encode(expected))]);
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return diff === 0;
}

function requireDb(env) {
  return env.DB ? null : json({ error: "The private build worker database is not configured." }, 503);
}

function rollupStepStates(states) {
  if (!states.length) return "queued";
  if (states.some((state) => state === "failed")) return "failed";
  if (states.some((state) => ["blocked", "interrupted", "cancelled"].includes(state))) return "blocked";
  if (states.every((state) => state === "passed" || state === "skipped")) return "passed";
  if (states.some((state) => state === "running")) return "running";
  return "queued";
}

function rollupItemStates(states) {
  if (!states.length) return "queued";
  if (states.some((state) => state === "failed")) return "failed";
  if (states.some((state) => ["blocked", "cancelled"].includes(state))) return "blocked";
  if (states.every((state) => state === "passed")) return "passed";
  if (states.some((state) => state === "running")) return "running";
  return "queued";
}

async function updateBuildRollup(env, batchId, itemId, timestamp) {
  const itemSteps = await env.DB.prepare("SELECT state FROM build_item_steps WHERE item_id=? ORDER BY step_index").bind(itemId).all();
  const itemState = rollupStepStates((itemSteps.results || []).map((row) => row.state));
  await env.DB.prepare("UPDATE build_batch_items SET state=?, updated_at=? WHERE id=? AND state != 'cancelled'").bind(itemState, timestamp, itemId).run();
  const batchItems = await env.DB.prepare("SELECT state FROM build_batch_items WHERE batch_id=? ORDER BY created_at").bind(batchId).all();
  const batchState = rollupItemStates((batchItems.results || []).map((row) => row.state));
  await env.DB.prepare("UPDATE build_batches SET state=?, updated_at=? WHERE id=? AND state != 'cancelled'").bind(batchState, timestamp, batchId).run();
  return { itemState, batchState };
}

async function leaseBuildStep(request, env) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "").trim();
  if (!/^[A-Za-z0-9._:-]{3,120}$/.test(runnerId)) return json({ error: "Valid runner identifier required." }, 400);
  const timestamp = now();
  await env.DB.prepare("UPDATE build_item_steps SET state='failed', completed_at=?, updated_at=? WHERE state IN ('running','ready') AND lease_expires_at < ?").bind(timestamp, timestamp, timestamp).run();
  const candidate = await env.DB.prepare(
    "SELECT s.id, s.batch_id, s.item_id, s.step_id, s.label, s.command_ref, i.product_id, i.product_name, i.decision, i.target_product_id, i.recipe_id FROM build_item_steps s JOIN build_batch_items i ON i.id=s.item_id WHERE s.state='queued' AND NOT EXISTS (SELECT 1 FROM build_item_steps earlier WHERE earlier.item_id=s.item_id AND earlier.step_index < s.step_index AND earlier.state != 'passed') ORDER BY s.created_at, s.step_index LIMIT 1"
  ).first();
  if (!candidate) return new Response(null, { status: 204 });
  if (!approvedCommandRefs().has(candidate.command_ref)) return json({ error: "Step command reference is not approved." }, 409);
  const runId = crypto.randomUUID();
  const expires = leaseUntil();
  const claimed = await env.DB.prepare("UPDATE build_item_steps SET state='running', leased_by=?, lease_expires_at=?, started_at=COALESCE(started_at, ?), updated_at=? WHERE id=? AND state='queued'").bind(runnerId, expires, timestamp, timestamp, candidate.id).run();
  if (!claimed.meta?.changes) return new Response(null, { status: 204 });
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO build_worker_runs (id, batch_id, item_id, step_id, runner_id, command_ref, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'leased', ?, ?)"
    ).bind(runId, candidate.batch_id, candidate.item_id, candidate.id, runnerId, candidate.command_ref, timestamp, timestamp),
    env.DB.prepare("UPDATE build_batch_items SET state='running', updated_at=? WHERE id=? AND state='queued'").bind(timestamp, candidate.item_id),
    env.DB.prepare("UPDATE build_batches SET state='running', updated_at=? WHERE id=? AND state IN ('queued','planning','ready')").bind(timestamp, candidate.batch_id)
  ]);
  return json({ run: { id: runId, leaseExpiresAt: expires, commandRef: candidate.command_ref, step: candidate } });
}

async function completeBuildRun(request, env, runId) {
  const input = await requestJson(request);
  const runnerId = String(input?.runnerId || "").trim();
  const state = String(input?.state || "").trim();
  if (!["passed", "failed", "blocked", "interrupted"].includes(state)) return json({ error: "Invalid terminal state." }, 400);
  const run = await env.DB.prepare("SELECT id, batch_id, item_id, step_id FROM build_worker_runs WHERE id=? AND runner_id=?").bind(runId, runnerId).first();
  if (!run) return json({ error: "Active build run not found." }, 404);
  const timestamp = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE build_worker_runs SET state=?, result_json=?, updated_at=? WHERE id=?").bind(state, JSON.stringify(input?.result || {}).slice(0, 100_000), timestamp, runId),
    env.DB.prepare("UPDATE build_item_steps SET state=?, completed_at=?, updated_at=?, lease_expires_at=NULL WHERE id=? AND leased_by=?").bind(state, timestamp, timestamp, run.step_id, runnerId)
  ]);
  const rollup = await updateBuildRollup(env, run.batch_id, run.item_id, timestamp);
  return json({ state, ...rollup });
}

export async function handleBuildWorkerApi(request, env, url) {
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  if (!await authorized(request, env)) return json({ error: "Build runner authentication required." }, 401);
  if (request.method === "POST" && url.pathname === "/api/build-runner/lease") return leaseBuildStep(request, env);
  const complete = url.pathname.match(/^\/api\/build-runner\/runs\/([A-Za-z0-9-]+)\/complete$/);
  if (request.method === "POST" && complete) return completeBuildRun(request, env, complete[1]);
  return json({ error: "Build runner endpoint not found." }, 404);
}
