import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const hosting = JSON.parse(await readFile(resolve(root, ".openai/hosting.json"), "utf8"));
assert.equal(typeof hosting, "object");

const workerModule = await import(pathToFileURL(resolve(root, "worker/index.mjs")).href);
assert.equal(typeof workerModule.default?.fetch, "function");

const health = await workerModule.default.fetch(new Request("https://admin.techmaxxed.com/health"));
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

const unauthorized = await workerModule.default.fetch(new Request("https://admin.techmaxxed.com/"));
assert.equal(unauthorized.status, 401);

console.log("Platform artifact, hosting config, and boundary checks passed.");
