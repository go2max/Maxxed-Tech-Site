import { actorCan } from "./admin-users.js";
import { scanCatalogSelection } from "./build-scanner.js";
import { recipeForItem, stepsForRecipe } from "./build-recipes.js";

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const now = () => new Date().toISOString();
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

async function body(request) {
  try { return await request.json(); } catch { return null; }
}

function requireDb(env) {
  return env.DB ? null : json({ error: "The private build queue database is not configured." }, 503);
}

export async function listBuildBatches(env) {
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const batches = await env.DB.prepare("SELECT id, state, created_by, created_at, updated_at, title, summary FROM build_batches ORDER BY created_at DESC LIMIT 50").all();
  const rows = [];
  for (const batch of batches.results || []) {
    const items = await env.DB.prepare("SELECT id, product_id, product_name, decision, confidence, target_product_id, state, reasons, recipe_id, created_at, updated_at FROM build_batch_items WHERE batch_id=? ORDER BY created_at").bind(batch.id).all();
    const enriched = [];
    for (const item of items.results || []) {
      const steps = await env.DB.prepare("SELECT id, step_index, step_id, label, command_ref, state, result_json, created_at, updated_at FROM build_item_steps WHERE item_id=? ORDER BY step_index").bind(item.id).all();
      enriched.push({ ...item, reasons: JSON.parse(item.reasons || "[]"), steps: steps.results || [] });
    }
    rows.push({ ...batch, items: enriched });
  }
  return json({ batches: rows });
}

export async function createBuildBatch(request, env, actorEmail) {
  if (!await actorCan(actorEmail, env, "worker:queue")) return json({ error: "Builder role required." }, 403);
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const input = await body(request);
  const scan = scanCatalogSelection(input?.productIds);
  const actionable = scan.results.filter((result) => result.decision !== "duplicate");
  if (!actionable.length || actionable.length > 50) return json({ error: "Choose 1-50 non-duplicate products." }, 400);
  const timestamp = now();
  const batchId = crypto.randomUUID();
  const title = String(input?.title || `Build batch ${timestamp.slice(0, 10)}`).slice(0, 140);
  const statements = [
    env.DB.prepare("INSERT INTO build_batches (id, state, created_by, created_at, updated_at, title, summary) VALUES (?, 'queued', ?, ?, ?, ?, ?)").bind(batchId, actorEmail, timestamp, timestamp, title, JSON.stringify({ total: actionable.length }))
  ];
  for (const item of actionable) {
    const itemId = crypto.randomUUID();
    const recipeId = recipeForItem(item);
    statements.push(env.DB.prepare(
      "INSERT INTO build_batch_items (id, batch_id, product_id, product_name, decision, confidence, target_product_id, state, reasons, created_at, updated_at, recipe_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      itemId,
      batchId,
      item.id,
      item.name || item.id,
      item.decision,
      item.confidence,
      item.targetProductId || null,
      item.decision === "needs-human-review" ? "blocked" : "queued",
      JSON.stringify(item.reasons || []),
      timestamp,
      timestamp,
      recipeId
    ));
    stepsForRecipe(recipeId).forEach((step, index) => {
      statements.push(env.DB.prepare(
        "INSERT INTO build_item_steps (id, batch_id, item_id, step_index, step_id, label, command_ref, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        batchId,
        itemId,
        index,
        step.id,
        step.label,
        step.commandRef,
        item.decision === "needs-human-review" ? "blocked" : "queued",
        timestamp,
        timestamp
      ));
    });
  }
  await env.DB.batch(statements);
  return json({ batch: { id: batchId, state: "queued", itemCount: actionable.length, title } }, 201);
}

export async function cancelBuildBatch(env, actorEmail, batchId) {
  if (!await actorCan(actorEmail, env, "worker:cancel")) return json({ error: "Worker cancel role required." }, 403);
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const batch = await env.DB.prepare("SELECT id, state FROM build_batches WHERE id=?").bind(batchId).first();
  if (!batch) return json({ error: "Build batch not found." }, 404);
  if (["passed", "failed", "cancelled"].includes(batch.state)) return json({ error: "Build batch is already terminal." }, 409);
  const timestamp = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE build_batches SET state='cancelled', updated_at=? WHERE id=?").bind(timestamp, batchId),
    env.DB.prepare("UPDATE build_batch_items SET state='cancelled', updated_at=? WHERE batch_id=? AND state NOT IN ('passed','failed','cancelled')").bind(timestamp, batchId),
    env.DB.prepare("UPDATE build_item_steps SET state='cancelled', completed_at=COALESCE(completed_at, ?), updated_at=?, lease_expires_at=NULL WHERE batch_id=? AND state NOT IN ('passed','failed','cancelled')").bind(timestamp, timestamp, batchId),
    env.DB.prepare("UPDATE build_worker_runs SET state='interrupted', updated_at=? WHERE batch_id=? AND state IN ('leased','running')").bind(timestamp, batchId)
  ]);
  return json({ batch: { id: batchId, state: "cancelled", updatedAt: timestamp } });
}
