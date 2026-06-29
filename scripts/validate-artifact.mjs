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

const privacy = await workerModule.default.fetch(new Request("https://example.test/apps/rival-rush/privacy/"));
assert.equal(privacy.status, 200);
assert.match(await privacy.text(), /<h1>Rival Rush Privacy Policy<\/h1>/);

const readme = await workerModule.default.fetch(new Request("https://example.test/apps/fishing-maxxed/readme/"));
assert.equal(readme.status, 200);
assert.match(await readme.text(), /<h1>Fishing Maxxed README<\/h1>/);

const beta = await workerModule.default.fetch(new Request("https://example.test/beta/?app=rival-rush"));
assert.equal(beta.status, 200);
assert.match(await beta.text(), /<h1>Become a beta tester<\/h1>/);

const plugins = await workerModule.default.fetch(new Request("https://example.test/plugins/"));
assert.equal(plugins.status, 200);
assert.match(await plugins.text(), /<h1>WordPress plugins<\/h1>/);

const admin = await workerModule.default.fetch(new Request("https://example.test/admin/"));
assert.equal(admin.status, 200);
assert.match(await admin.text(), /<h1>Maxxed admin routing<\/h1>/);

const adminPlugins = await workerModule.default.fetch(new Request("https://example.test/admin/plugins/"));
assert.equal(adminPlugins.status, 200);
assert.match(await adminPlugins.text(), /<h1>WordPress plugin admin<\/h1>/);

const redirect = await workerModule.default.fetch(new Request("https://example.test/apps"));
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.get("location"), "https://example.test/apps/");

const stylesheet = await workerModule.default.fetch(new Request("https://example.test/assets/site.css"));
assert.equal(stylesheet.status, 200);
assert.match(stylesheet.headers.get("content-type"), /^text\/css/);

const missing = await workerModule.default.fetch(new Request("https://example.test/not-a-page"));
assert.equal(missing.status, 404);
const missingHtml = await missing.text();
assert.match(missingHtml, /href="\/assets\/site\.css"/);
assert.match(missingHtml, /src="\/assets\/site\.js"/);

const deepMissing = await workerModule.default.fetch(new Request("https://example.test/apps/unknown/deep-page"));
assert.equal(deepMissing.status, 404);
assert.match(await deepMissing.text(), /href="\/assets\/site\.css"/);

console.log("Artifact is valid ESM; routes, redirects, assets, and 404 responses passed.");
