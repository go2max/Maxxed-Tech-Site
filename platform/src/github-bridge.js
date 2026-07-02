import { actorCan } from "./admin-users.js";

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const now = () => new Date().toISOString();

function requireDb(env) {
  return env.DB ? null : json({ error: "The private GitHub bridge database is not configured." }, 503);
}

async function requestJson(request) {
  try { return await request.json(); } catch { return null; }
}

function clean(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function validRepo(value) {
  return !value || /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

export async function listGithubLinks(env, batchId) {
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const result = await env.DB.prepare("SELECT id, batch_id, item_id, repository, branch, pull_request_url, pull_request_number, ci_state, notes, created_by, created_at, updated_at FROM build_github_links WHERE batch_id=? ORDER BY updated_at DESC").bind(batchId).all();
  return json({ links: result.results || [] });
}

export async function upsertGithubLink(request, env, actorEmail, batchId) {
  if (!await actorCan(actorEmail, env, "github:write")) return json({ error: "GitHub write role required." }, 403);
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const input = await requestJson(request);
  const itemId = clean(input?.itemId, 120);
  const repository = clean(input?.repository, 160);
  const branch = clean(input?.branch, 180);
  const pullRequestUrl = clean(input?.pullRequestUrl, 500);
  const ciState = clean(input?.ciState || "unknown", 20);
  if (!itemId) return json({ error: "itemId is required." }, 400);
  if (!validRepo(repository)) return json({ error: "Repository must be owner/name." }, 400);
  if (!["unknown", "pending", "passed", "failed", "cancelled"].includes(ciState)) return json({ error: "Invalid CI state." }, 400);
  const item = await env.DB.prepare("SELECT id FROM build_batch_items WHERE id=? AND batch_id=?").bind(itemId, batchId).first();
  if (!item) return json({ error: "Build item not found in batch." }, 404);
  const timestamp = now();
  const id = clean(input?.id, 120) || crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO build_github_links (id, batch_id, item_id, repository, branch, pull_request_url, pull_request_number, ci_state, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET repository=excluded.repository, branch=excluded.branch, pull_request_url=excluded.pull_request_url, pull_request_number=excluded.pull_request_number, ci_state=excluded.ci_state, notes=excluded.notes, updated_at=excluded.updated_at"
  ).bind(id, batchId, itemId, repository || null, branch || null, pullRequestUrl || null, Number.isInteger(input?.pullRequestNumber) ? input.pullRequestNumber : null, ciState, clean(input?.notes, 1000) || null, actorEmail, timestamp, timestamp).run();
  return json({ link: { id, batchId, itemId, repository, branch, pullRequestUrl, ciState, updatedAt: timestamp } }, 201);
}
