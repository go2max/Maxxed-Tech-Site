import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the deployment archive has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

const home = await workerModule.default.fetch(new Request("https://example.test/"));
assert.equal(home.status, 200);
assert.match(await home.text(), /<h1>Maxxed Technical Systems<\/h1>/);

const product = await workerModule.default.fetch(new Request("https://example.test/apps/maxxed-compass/"));
assert.equal(product.status, 200);
assert.match(await product.text(), /<h1>Maxxed Compass<\/h1>/);

const redirect = await workerModule.default.fetch(new Request("https://example.test/apps"));
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.get("location"), "https://example.test/apps/");

const stylesheet = await workerModule.default.fetch(new Request("https://example.test/assets/site.css"));
assert.equal(stylesheet.status, 200);
assert.match(stylesheet.headers.get("content-type"), /^text\/css/);

const missing = await workerModule.default.fetch(new Request("https://example.test/not-a-page"));
assert.equal(missing.status, 404);

console.log("Artifact is valid ESM; routes, redirects, assets, and 404 responses passed.");
