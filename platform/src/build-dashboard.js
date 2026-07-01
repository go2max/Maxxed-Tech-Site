import { buildCatalog } from "./build-catalog.js";
import { publicBuildRecipes } from "./build-recipes.js";
import { publicPolishChecklist } from "./polish-review.js";
import { publicQaRules } from "./qa-gates.js";

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

export async function buildDashboard(env) {
  const catalog = buildCatalog();
  const recipes = publicBuildRecipes();
  const qaRules = publicQaRules().rules;
  const polishChecklist = publicPolishChecklist().checklist;
  let batches = [];
  if (env.DB) {
    const result = await env.DB.prepare("SELECT id, state, title, created_by, created_at, updated_at, testing_ready_at FROM build_batches ORDER BY created_at DESC LIMIT 10").all();
    batches = result.results || [];
  }
  return json({
    summary: {
      catalogProducts: catalog.products.length,
      recipes: recipes.length,
      qaRules: qaRules.length,
      polishChecks: polishChecklist.length,
      recentBatches: batches.length
    },
    batches
  });
}
