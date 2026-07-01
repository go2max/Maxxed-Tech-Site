import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const workerPath = resolve(root, "dist/server/index.js");
const manifest = JSON.parse(await readFile(resolve(root, "dist/.openai/hosting.json"), "utf8"));
assert.equal(manifest.d1, "DB");
assert.equal(manifest.r2, "ARTIFACTS");
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0001_runner_pipeline.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS device_leases/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0002_admin_security_audit.sql"), "utf8"), /audit_events_actor_created_idx/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0003_admin_users.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS admin_users/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0004_build_batches.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS build_batch_items/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0005_build_command_contract.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS build_item_steps/);
assert.match(await readFile(resolve(root, "dist/server/build-worker.js"), "utf8"), /NOT EXISTS \(SELECT 1 FROM build_item_steps earlier/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0006_build_worker_bridge.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS build_worker_runs/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0007_testing_readiness_gate.sql"), "utf8"), /testing_ready_at/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0008_polish_review.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS polish_reviews/);
assert.match(await readFile(resolve(root, "dist/.openai/drizzle/0009_github_bridge.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS build_github_links/);
const module = await import(`${pathToFileURL(workerPath)}?validation=${Date.now()}`);
assert.equal(typeof module.default?.fetch, "function");

const env = { ADMIN_ALLOWED_EMAILS: "admin@techmaxxed.com,viewer@techmaxxed.com", ADMIN_OWNER_EMAILS: "admin@techmaxxed.com", ADMIN_VIEWER_EMAILS: "viewer@techmaxxed.com", RUNNER_TOKEN: "runner-test-token" };
const unauthorized = await module.default.fetch(new Request("https://admin.test/admin/testing-functions/"), env);
assert.equal(unauthorized.status, 403);
const headers = { "oai-authenticated-user-email": "admin@techmaxxed.com" };
const page = await module.default.fetch(new Request("https://admin.test/", { headers }), env);
assert.equal(page.status, 200);
const pageHtml = await page.text();
assert.match(pageHtml, /Testing Functions/);
assert.match(pageHtml, /Run selected/);
const security = await module.default.fetch(new Request("https://admin.test/admin/security/", { headers }), env);
assert.equal(security.status, 200);
assert.match(await security.text(), /Audit Events/);
const settings = await module.default.fetch(new Request("https://admin.test/admin/settings/", { headers }), env);
assert.equal(settings.status, 200);
assert.match(await settings.text(), /Admin Settings/);
const catalogPage = await module.default.fetch(new Request("https://admin.test/admin/catalog/", { headers }), env);
assert.equal(catalogPage.status, 200);
assert.match(await catalogPage.text(), /Build Catalog/);
const buildsPage = await module.default.fetch(new Request("https://admin.test/admin/builds/", { headers }), env);
assert.equal(buildsPage.status, 200);
const buildsPageHtml = await buildsPage.text();
assert.match(buildsPageHtml, /Build Dashboard/);
assert.match(buildsPageHtml, /Cancel batch/);
const catalog = await module.default.fetch(new Request("https://admin.test/api/test-catalog", { headers }), env);
assert.equal(catalog.status, 200);
const catalogText = await catalog.text();
assert.match(catalogText, /maxxed-remote-full-ux-connection/);
assert.doesNotMatch(catalogText, /commandRef|runner\/script-packs/);
const buildCatalog = await module.default.fetch(new Request("https://admin.test/api/build-catalog", { headers }), env);
assert.equal(buildCatalog.status, 200);
const buildCatalogJson = await buildCatalog.json();
assert.ok(buildCatalogJson.products.some((product) => product.id === "job-application-tracker"));
assert.ok(buildCatalogJson.products.some((product) => product.id === "maxxed-measure"));
const recipes = await module.default.fetch(new Request("https://admin.test/api/build-recipes", { headers }), env);
assert.equal(recipes.status, 200);
const recipesJson = await recipes.json();
assert.ok(recipesJson.recipes.some((recipe) => recipe.id === "web-tool-new"));
assert.ok(JSON.stringify(recipesJson).includes("build-recipes/web-tool/qa-gate"));
const qaRules = await module.default.fetch(new Request("https://admin.test/api/qa-rules", { headers }), env);
assert.equal(qaRules.status, 200);
assert.ok((await qaRules.json()).rules.includes("qa-gate-step-passed"));
const polishChecklist = await module.default.fetch(new Request("https://admin.test/api/polish-checklist", { headers }), env);
assert.equal(polishChecklist.status, 200);
assert.ok((await polishChecklist.json()).checklist.includes("opens-without-crash"));
const dashboard = await module.default.fetch(new Request("https://admin.test/api/build-dashboard", { headers }), env);
assert.equal(dashboard.status, 200);
assert.ok((await dashboard.json()).summary.catalogProducts >= 6);
const scan = await module.default.fetch(new Request("https://admin.test/api/build-scan", {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ productIds: ["maxxed-measure", "job-application-tracker", "broken-link-capture"] })
}), env);
assert.equal(scan.status, 200);
const scanJson = await scan.json();
assert.equal(scanJson.results.length, 3);
assert.ok(scanJson.results.some((result) => result.id === "maxxed-measure" && result.decision === "extend-existing"));

const viewerHeaders = { "oai-authenticated-user-email": "viewer@techmaxxed.com" };
const viewerCatalog = await module.default.fetch(new Request("https://admin.test/admin/catalog/", { headers: viewerHeaders }), env);
assert.equal(viewerCatalog.status, 200);
const viewerSettings = await module.default.fetch(new Request("https://admin.test/admin/settings/", { headers: viewerHeaders }), env);
assert.equal(viewerSettings.status, 403);
const viewerQueue = await module.default.fetch(new Request("https://admin.test/api/build-batches", {
  method: "POST",
  headers: { ...viewerHeaders, "content-type": "application/json" },
  body: JSON.stringify({ productIds: ["broken-link-capture"] })
}), env);
assert.equal(viewerQueue.status, 403);

const statements = [];
const DB = {
  prepare(sql) {
    const statement = {
      sql,
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() {
        if (sql.startsWith("SELECT id, app_id FROM test_artifacts")) {
          const artifactId = this.values[0];
          const appId = String(artifactId).includes("remote") ? "maxxed-remote" : "rival-rush";
          return { id: artifactId, app_id: appId };
        }
        if (sql.startsWith("SELECT s.id, s.batch_id")) {
          return { id: "step-1", batch_id: "batch-1", item_id: "item-1", step_id: "qa-gate", label: "Run web QA gate", command_ref: "build-recipes/web-tool/qa-gate", product_id: "broken-link-capture", product_name: "Broken Link Capture", decision: "new-product", target_product_id: null, recipe_id: "web-tool-new" };
        }
        if (sql.startsWith("SELECT id, batch_id, item_id, step_id FROM build_worker_runs")) {
          return { id: this.values[0], batch_id: "batch-1", item_id: "item-1", step_id: "step-1" };
        }
        if (sql.startsWith("SELECT id, state FROM build_batches")) {
          return { id: this.values[0], state: "queued" };
        }
        if (sql.startsWith("SELECT id FROM build_batch_items WHERE id=?")) {
          return { id: this.values[0] };
        }
        return null;
      },
      async all() {
        if (sql.startsWith("SELECT state FROM build_item_steps")) {
          return { results: [{ state: "passed" }] };
        }
        if (sql.startsWith("SELECT state FROM build_batch_items")) {
          return { results: [{ state: "passed" }] };
        }
        return { results: [] };
      },
      async run() { return { success: true, meta: { changes: 1 } }; }
    };
    statements.push(statement);
    return statement;
  },
  async batch(batch) { assert.ok(batch.length >= 2); return batch.map(() => ({ success: true, meta: { changes: 1 } })); }
};
const storedObjects = new Map();
const ARTIFACTS = {
  async put(key, value) { storedObjects.set(key, value); },
  async get(key) { return storedObjects.has(key) ? { body: storedObjects.get(key) } : null; },
  async delete(key) { storedObjects.delete(key); }
};
const dbEnv = { ...env, DB, ARTIFACTS };
const request = (body, origin = "https://admin.test") => new Request("https://admin.test/api/test-jobs", { method: "POST", headers: { ...headers, origin, "content-type": "application/json" }, body: JSON.stringify(body) });

const crossOrigin = await module.default.fetch(request({ appId: "rival-rush", artifactId: "artifact-rival", scriptIds: ["rival-launch"] }, "https://evil.test"), dbEnv);
assert.equal(crossOrigin.status, 403);

const unapproved = await module.default.fetch(request({ appId: "rival-rush", artifactId: "artifact-rival", scriptIds: ["arbitrary-command"] }), dbEnv);
assert.equal(unapproved.status, 400);

const single = await module.default.fetch(request({ appId: "rival-rush", artifactId: "artifact-rival", scriptIds: ["rival-launch"] }), dbEnv);
assert.equal(single.status, 201);
assert.deepEqual((await single.json()).scriptIds, ["rival-launch"]);

const multiple = await module.default.fetch(request({ appId: "rival-rush", artifactId: "artifact-rival", scriptIds: ["rival-navigation", "rival-gameplay"] }), dbEnv);
assert.equal(multiple.status, 201);
assert.deepEqual((await multiple.json()).scriptIds, ["rival-navigation", "rival-gameplay"]);

const suite = await module.default.fetch(request({ appId: "maxxed-remote", artifactId: "artifact-remote", suiteId: "oneClick" }), dbEnv);
assert.equal(suite.status, 201);
assert.deepEqual((await suite.json()).scriptIds, ["maxxed-remote-full-ux-connection"]);
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO test_jobs")));

const apk = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
const upload = await module.default.fetch(new Request("https://admin.test/api/test-artifacts", { method: "POST", headers: { ...headers, origin: "https://admin.test", "content-type": "application/vnd.android.package-archive", "x-app-id": "rival-rush", "x-file-name": "RivalRush.apk" }, body: apk }), dbEnv);
assert.equal(upload.status, 201);
assert.equal(storedObjects.size, 1);

const audit = await module.default.fetch(new Request("https://admin.test/api/audit-events", { headers }), dbEnv);
assert.equal(audit.status, 200);
assert.ok(Array.isArray((await audit.json()).events));
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO audit_events")));

const users = await module.default.fetch(new Request("https://admin.test/api/admin-users", { headers }), dbEnv);
assert.equal(users.status, 200);
assert.ok((await users.json()).users.some((user) => user.email === "admin@techmaxxed.com" && user.role === "owner"));

const saveUser = await module.default.fetch(new Request("https://admin.test/api/admin-users", {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ email: "builder@techmaxxed.com", role: "builder", status: "active" })
}), dbEnv);
assert.equal(saveUser.status, 201);
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO admin_users")));

const buildBatch = await module.default.fetch(new Request("https://admin.test/api/build-batches", {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ productIds: ["broken-link-capture", "maxxed-measure"] })
}), dbEnv);
assert.equal(buildBatch.status, 201);
assert.ok((await buildBatch.json()).batch.itemCount >= 1);
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO build_batches")));
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO build_item_steps")));

const buildBatches = await module.default.fetch(new Request("https://admin.test/api/build-batches", { headers }), dbEnv);
assert.equal(buildBatches.status, 200);
assert.ok(Array.isArray((await buildBatches.json()).batches));

const cancelViewerDenied = await module.default.fetch(new Request("https://admin.test/api/build-batches/batch-1/cancel", {
  method: "POST",
  headers: viewerHeaders
}), dbEnv);
assert.equal(cancelViewerDenied.status, 403);

const cancelBatch = await module.default.fetch(new Request("https://admin.test/api/build-batches/batch-1/cancel", {
  method: "POST",
  headers
}), dbEnv);
assert.equal(cancelBatch.status, 200);
assert.equal((await cancelBatch.json()).batch.state, "cancelled");
assert.ok(statements.some((statement) => statement.sql.startsWith("UPDATE build_batches SET state='cancelled'")));

const githubViewerDenied = await module.default.fetch(new Request("https://admin.test/api/build-batches/batch-1/github-links", {
  method: "POST",
  headers: { ...viewerHeaders, "content-type": "application/json" },
  body: JSON.stringify({ itemId: "item-1", repository: "go2max/example" })
}), dbEnv);
assert.equal(githubViewerDenied.status, 403);

const githubLink = await module.default.fetch(new Request("https://admin.test/api/build-batches/batch-1/github-links", {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ itemId: "item-1", repository: "go2max/example", branch: "codex/example", pullRequestUrl: "https://github.com/go2max/example/pull/1", pullRequestNumber: 1, ciState: "pending" })
}), dbEnv);
assert.equal(githubLink.status, 201);
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO build_github_links")));

const runnerDenied = await module.default.fetch(new Request("https://admin.test/api/runner/lease", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), dbEnv);
assert.equal(runnerDenied.status, 401);

const buildRunnerDenied = await module.default.fetch(new Request("https://admin.test/api/build-runner/lease", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), dbEnv);
assert.equal(buildRunnerDenied.status, 401);
const buildLease = await module.default.fetch(new Request("https://admin.test/api/build-runner/lease", { method: "POST", headers: { authorization: "Bearer runner-test-token", "content-type": "application/json" }, body: JSON.stringify({ runnerId: "build-runner-1" }) }), dbEnv);
assert.equal(buildLease.status, 200);
const leasedRun = await buildLease.json();
assert.equal(leasedRun.run.commandRef, "build-recipes/web-tool/qa-gate");
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO build_worker_runs")));
assert.ok(statements.some((statement) => statement.sql.startsWith("UPDATE build_batch_items SET state='running'")));
assert.ok(statements.some((statement) => statement.sql.startsWith("UPDATE build_batches SET state='running'")));

const completeBuildRun = await module.default.fetch(new Request(`https://admin.test/api/build-runner/runs/${leasedRun.run.id}/complete`, {
  method: "POST",
  headers: { authorization: "Bearer runner-test-token", "content-type": "application/json" },
  body: JSON.stringify({ runnerId: "build-runner-1", state: "passed", result: { evidence: ["summary.md"], checks: ["qa-gate"] } })
}), dbEnv);
assert.equal(completeBuildRun.status, 200);
assert.deepEqual(await completeBuildRun.json(), { state: "passed", itemState: "passed", batchState: "passed" });
assert.ok(statements.some((statement) => statement.sql.startsWith("UPDATE build_batch_items SET state=?")));
assert.ok(statements.some((statement) => statement.sql.startsWith("UPDATE build_batches SET state=?")));

console.log("Private admin auth, APK intake, R2/D1 bindings, catalog, ordered jobs, origin checks, allowlisting, and runner auth passed.");
