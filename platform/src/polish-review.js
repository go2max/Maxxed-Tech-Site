const checklist = [
  "downloadable-artifact-present",
  "opens-without-crash",
  "primary-workflow-functional",
  "responsive-clean-ui",
  "no-placeholder-copy-or-default-assets",
  "screenshots-or-evidence-present",
  "privacy-help-and-release-notes-present",
  "store-or-readme-summary-present"
];

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

export function publicPolishChecklist() {
  return { checklist };
}

function requireDb(env) {
  return env.DB ? null : json({ error: "The private polish review database is not configured." }, 503);
}

export async function polishReport(env, batchId) {
  const unavailable = requireDb(env);
  if (unavailable) return unavailable;
  const batch = await env.DB.prepare("SELECT id, state, testing_ready_at, title FROM build_batches WHERE id=?").bind(batchId).first();
  if (!batch) return json({ error: "Build batch not found." }, 404);
  const items = await env.DB.prepare("SELECT id, product_id, product_name, qa_state, qa_summary FROM build_batch_items WHERE batch_id=? ORDER BY created_at").bind(batchId).all();
  const reports = [];
  for (const item of items.results || []) {
    const steps = await env.DB.prepare("SELECT step_id, label, state, result_json FROM build_item_steps WHERE item_id=? ORDER BY step_index").bind(item.id).all();
    const evidenceSummary = (steps.results || []).filter((step) => step.result_json).map((step) => ({ stepId: step.step_id, label: step.label, state: step.state }));
    reports.push({
      itemId: item.id,
      productId: item.product_id,
      productName: item.product_name,
      testingReady: item.qa_state === "testing-ready",
      checklist: checklist.map((id) => ({ id, state: item.qa_state === "testing-ready" ? "pending-review" : "blocked" })),
      evidenceSummary
    });
  }
  return json({ batch, checklist, reports });
}
