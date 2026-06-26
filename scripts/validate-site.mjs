import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files;
}

const files = await filesUnder(siteRoot);
const htmlFiles = files.filter((file) => extname(file) === ".html");
assert.equal(htmlFiles.length, 27, "Expected 26 indexed/static HTML pages and one 404 page");

const existing = new Set(files.map((file) => `/${relative(siteRoot, file).split(sep).join("/")}`));
const titles = new Set();
let checkedReferences = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const filePath = `/${relative(siteRoot, file).split(sep).join("/")}`;
  const route = filePath.endsWith("/index.html") ? filePath.slice(0, -"index.html".length) : filePath;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;

  assert.ok(html.startsWith("<!doctype html>"), `${filePath} needs an HTML5 doctype`);
  assert.match(html, /<html lang="en">/, `${filePath} needs a language declaration`);
  assert.ok(title, `${filePath} needs a title`);
  assert.ok(!titles.has(title), `Duplicate title: ${title}`);
  titles.add(title);
  assert.ok(description && description.length >= 50 && description.length <= 180, `${filePath} description should be 50-180 characters`);
  assert.equal(h1Count, 1, `${filePath} should contain exactly one h1`);
  assert.match(html, /<main id="main">/, `${filePath} needs a main landmark`);
  assert.match(html, /class="skip-link" href="#main"/, `${filePath} needs a skip link`);
  assert.match(html, /<meta property="og:title"/, `${filePath} needs Open Graph metadata`);
  if (filePath !== "/404.html") assert.match(html, /<link rel="canonical" href="https:\/\/techmaxxed\.com\//, `${filePath} needs a canonical URL`);

  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:#|mailto:|https?:|data:)/.test(reference)) continue;
    const resolvedUrl = new URL(reference, `https://example.test${route}`);
    let target = decodeURIComponent(resolvedUrl.pathname);
    if (target === "/") target = "/index.html";
    else if (target.endsWith("/")) target += "index.html";
    assert.ok(existing.has(target), `${filePath} has a broken reference: ${reference} -> ${target}`);
    checkedReferences += 1;
  }
}

const clientScript = await readFile(resolve(siteRoot, "assets/site.js"), "utf8");
new Function(clientScript);

const betaPage = await readFile(resolve(siteRoot, "beta/index.html"), "utf8");
assert.equal((betaPage.match(/name="apps"/g) || []).length, 6, "Beta page should offer all six active apps");
assert.match(betaPage, /beta@techmaxxed\.com/);
assert.match(betaPage, /voluntary and unpaid/i);
assert.match(betaPage, /name="creditConsent"/);

for (const slug of ["maxxed-remote", "maxxed-compass", "maxxed-measure", "maxxed-gold-estimator", "fishing-maxxed", "rival-rush"]) {
  const policy = await readFile(resolve(siteRoot, `apps/${slug}/privacy/index.html`), "utf8");
  assert.match(policy, /Permissions and purpose/);
  assert.match(policy, /Retention/);
  assert.match(policy, /Deletion/);
  assert.match(policy, /Third-party services/);
  assert.match(policy, /privacy@techmaxxed\.com/);
}

const pluginLab = await readFile(resolve(siteRoot, "tools/wordpress-plugin-lab/index.html"), "utf8");
assert.match(pluginLab, /WordPress Plugin Lab/);
assert.match(pluginLab, /local-artifacts\/wordpress/);
assert.match(pluginLab, /npm run wordpress:manifest/);
assert.match(pluginLab, /npm run wordpress:install/);

const postPurge = await readFile(resolve(siteRoot, "tools/post-purge-pro/index.html"), "utf8");
assert.match(postPurge, /Preview -&gt; Export -&gt; Confirm -&gt; Trash|Preview -> Export -> Confirm -> Trash/);
assert.match(postPurge, /Trash-only/);
assert.match(postPurge, /docker compose/);

assert.match(await readFile(resolve(siteRoot, "terms/index.html"), "utf8"), /Beta participation/);
assert.match(await readFile(resolve(siteRoot, "beta-credits/index.html"), "utf8"), /Public credit is recognition, not compensation/);

const sitemap = await readFile(resolve(siteRoot, "sitemap.xml"), "utf8");
assert.ok((sitemap.match(/<url>/g) || []).length >= 22, "Sitemap should contain generated indexed pages");
assert.match(sitemap, /tools\/wordpress-plugin-lab\//);
assert.match(await readFile(resolve(siteRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/techmaxxed\.com\/sitemap\.xml/);
JSON.parse(await readFile(resolve(siteRoot, "site.webmanifest"), "utf8"));

console.log(`Validated ${htmlFiles.length} HTML pages, ${checkedReferences} local references, unique metadata, sitemap, manifest, and client JavaScript.`);
