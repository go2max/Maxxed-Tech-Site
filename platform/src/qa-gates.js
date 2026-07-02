import { actorCan } from "./admin-users.js";

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const now = () => new Date().toISOString();

export const qaRules = [
  "all-build-steps-passed",
  "qa-gate-step-passed",
  "no-human-review-blockers",
  "no-failed-or-cancelled-steps",
  "evidence-or-result-json-present"
];

function requireDb(env) {
  return env.DB ? null : json({ error: "The private QA gate database is not configured." }, 503);
}

export function publicQaRules() {
  return { rules: qaRules };
}

export async function assessBatchReadiness(env, batchId) {
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const batch = await env.DB.prepare("SELECT id, state, title FROM build_batches WHERE id=?").bind(batchId).first();
  if (!batch) return json({ error: "Build batch not found." }, 404);
  const items = await env.DB.prepare("SELECT id, product_id, product_name, decision, state FROM build_batch_items WHERE batch_id=? ORDER BY created_at").bind(batchId).all();
  const results = [];
  for (const item of items.results || []) {
    const steps = await env.DB.prepare("SELECT step_id, label, state, result_json FROM build_item_steps WHERE item_id=? ORDER BY step_index").bind(item.id).all();
    const rows = steps.results || [];
    const blockers = [];
    if (item.decision === "needs-human-review" || item.state === "blocked") blockers.push("human-review-required");
    if (!rows.length) blockers.push("missing-build-steps");
    if (!rows.some((step) => step.step_id === "qa-gate" && step.state === "passed")) blockers.push("qa-gate-not-passed");
    if (rows.some((step) => ["failed", "cancelled", "blocked"].includes(step.state))) blockers.push("failed-or-blocked-step");
    if (rows.some((step) => step.state !== "passed")) blockers.push("not-all-steps-passed");
    if (!rows.some((step) => step.result_json)) blockers.push("missing-evidence-summary");
    results.push({ itemId: item.id, productId: item.product_id, productName: item.product_name, ready: blockers.length === 0, blockers, steps: rows });
  }
  return json({ batch, ready: results.length > 0 && results.every((item) => item.ready), items: results });
}

export async function markBatchTestingReady(request, env, actorEmail, batchId) {
  if (!await actorCan(actorEmail, env, "worker:queue")) return json({ error: "Builder or QA role required." }, 403);
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const assessmentResponse = await assessBatchReadiness(env, batchId);
  const assessment = await assessmentResponse.clone().json();
  if (!assessmentResponse.ok) return assessmentResponse;
  if (!assessment.ready) return json({ error: "QA gate has not passed.", assessment }, 409);
  const timestamp = now();
  const statements = [
    env.DB.prepare("UPDATE build_batches SET state='passed', testing_ready_at=?, testing_ready_by=?, updated_at=? WHERE id=?").bind(timestamp, actorEmail, timestamp, batchId)
  ];
  for (const item of assessment.items) {
    statements.push(env.DB.prepare("UPDATE build_batch_items SET state='passed', qa_state='testing-ready', qa_summary=?, updated_at=? WHERE id=?").bind(JSON.stringify({ checkedAt: timestamp, rules: qaRules }), timestamp, item.itemId));
  }
  await env.DB.batch(statements);
  return json({ ready: true, batchId, testingReadyAt: timestamp });
}
