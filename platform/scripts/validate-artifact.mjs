import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const workerPath = resolve(root, "dist/server/index.js");
JSON.parse(await readFile(resolve(root, "dist/.openai/hosting.json"), "utf8"));
const module = await import(`${pathToFileURL(workerPath)}?validation=${Date.now()}`);
assert.equal(typeof module.default?.fetch, "function");

const env = { ADMIN_ALLOWED_EMAILS: "admin@techmaxxed.com" };
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
assert.match(await catalog.text(), /maxxed-remote-full-ux-connection/);

const statements = [];
const DB = {
  prepare(sql) {
    const statement = { sql, values: [], bind(...values) { this.values = values; return this; } };
    statements.push(statement);
    return statement;
  },
  async batch(batch) { assert.equal(batch.length, 2); return batch.map(() => ({ success: true })); }
};
const dbEnv = { ...env, DB };
const request = (body, origin = "https://admin.test") => new Request("https://admin.test/api/test-jobs", { method: "POST", headers: { ...headers, origin, "content-type": "application/json" }, body: JSON.stringify(body) });

const crossOrigin = await module.default.fetch(request({ appId: "rival-rush", scriptIds: ["rival-launch"] }, "https://evil.test"), dbEnv);
assert.equal(crossOrigin.status, 403);

const unapproved = await module.default.fetch(request({ appId: "rival-rush", scriptIds: ["arbitrary-command"] }), dbEnv);
assert.equal(unapproved.status, 400);

const single = await module.default.fetch(request({ appId: "rival-rush", scriptIds: ["rival-launch"] }), dbEnv);
assert.equal(single.status, 201);
assert.deepEqual((await single.json()).scriptIds, ["rival-launch"]);

const multiple = await module.default.fetch(request({ appId: "rival-rush", scriptIds: ["rival-navigation", "rival-gameplay"] }), dbEnv);
assert.equal(multiple.status, 201);
assert.deepEqual((await multiple.json()).scriptIds, ["rival-navigation", "rival-gameplay"]);

const suite = await module.default.fetch(request({ appId: "maxxed-remote", suiteId: "oneClick" }), dbEnv);
assert.equal(suite.status, 201);
assert.deepEqual((await suite.json()).scriptIds, ["maxxed-remote-full-ux-connection"]);
assert.ok(statements.some((statement) => statement.sql.startsWith("INSERT INTO test_jobs")));

console.log("Private admin auth, catalog, main-page suites, single/multi-script jobs, origin checks, allowlisting, and D1 writes passed.");
