const recipes = {
  "android-extend": [
    step("repo-audit", "Audit current Android repo", "build-recipes/android/repo-audit", "Read repo state, Gradle config, app id, tests, and release docs."),
    step("implementation-plan", "Create scoped implementation plan", "build-recipes/android/implementation-plan", "Plan changes without touching protected files or unrelated branches."),
    step("qa-gate", "Run Android QA gate", "build-recipes/android/qa-gate", "Run unit, lint, build, install/open smoke, and evidence capture.")
  ],
  "web-tool-new": [
    step("scaffold-plan", "Create web tool build plan", "build-recipes/web-tool/scaffold-plan", "Prepare repo/build scope, product docs, and release checklist."),
    step("static-app-build", "Build static app artifact", "build-recipes/web-tool/static-app-build", "Build or polish the local-first web app with docs and validation."),
    step("qa-gate", "Run web QA gate", "build-recipes/web-tool/qa-gate", "Run smoke tests, link checks, artifact validation, and screenshot review.")
  ],
  "wordpress-plugin-new": [
    step("plugin-plan", "Create plugin build plan", "build-recipes/wordpress/plugin-plan", "Confirm plugin boundaries, non-destructive workflow, and admin screens."),
    step("plugin-build", "Build WordPress plugin artifact", "build-recipes/wordpress/plugin-build", "Create package, README, assets, tests, and release readiness."),
    step("qa-gate", "Run plugin QA gate", "build-recipes/wordpress/qa-gate", "Run PHP syntax/tests where available, package validation, and safety review.")
  ],
  "human-review": [
    step("scope-review", "Human scope review", "build-recipes/review/scope-review", "Block execution until product owner chooses new product, extension target, or duplicate.")
  ]
};

function step(id, label, commandRef, description) {
  return { id, label, commandRef, description };
}

export function recipeForItem(item) {
  if (item.decision === "extend-existing") return "android-extend";
  if (item.decision === "needs-human-review") return "human-review";
  if (String(item.id || "").includes("wordpress") || String(item.platform || "").includes("wordpress")) return "wordpress-plugin-new";
  return "web-tool-new";
}

export function stepsForRecipe(recipeId) {
  return recipes[recipeId] || recipes["human-review"];
}

export function publicBuildRecipes() {
  return Object.entries(recipes).map(([id, steps]) => ({ id, steps }));
}

export function approvedCommandRefs() {
  return new Set(Object.values(recipes).flat().map((step) => step.commandRef));
}
