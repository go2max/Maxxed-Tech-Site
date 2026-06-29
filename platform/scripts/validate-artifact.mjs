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
const module = await import(`${pathToFileURL(workerPath)}?validation=${Date.now()}`);
assert.equal(typeof module.default?.fetch, "function");

const env = { ADMIN_ALLOWED_EMAILS: "admin@techmaxxed.com", RUNNER_TOKEN: "runner-test-token" };
const unauthorized = await module.default.fetch(new Request("https://admin.test/admin/testing-functions/"), env);
assert.equal(unauthorized.status, 403);
const headers = { "oai-authenticated-user-email": "admin@techmaxxed.com" };
const page = await module.default.fetch(new Request("https://admin.test/", { headers }), env);
assert.equal(page.status, 200);
const pageHtml = await page.text();
assert.match(pageHtml, /Testing Functions/);
assert.match(pageHtml, /Run selected/);
const catalog = await module.default.fetch(new Request("https://admin.test/api/test-catalog", { headers }), env);
assert.equal(catalog.status, 200);
const catalogText = await catalog.text();
assert.match(catalogText, /maxxed-remote-full-ux-connection/);
assert.doesNotMatch(catalogText, /commandRef|runner\/script-packs/);

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
        return null;
      },
      async all() { return { results: [] }; },
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

const runnerDenied = await module.default.fetch(new Request("https://admin.test/api/runner/lease", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), dbEnv);
assert.equal(runnerDenied.status, 401);

console.log("Private admin auth, APK intake, R2/D1 bindings, catalog, ordered jobs, origin checks, allowlisting, and runner auth passed.");
