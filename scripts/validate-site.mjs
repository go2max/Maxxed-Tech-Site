import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { apps, wordpressPlugins } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const adminRoot = resolve(root, "admin");

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
const adminFiles = await filesUnder(adminRoot);
const htmlFiles = files.filter((file) => extname(file) === ".html");
assert.equal(htmlFiles.length, 251, "Expected 250 indexed public HTML pages and one 404 page");
const expectedAppSlugs = [
  "maxxed-remote",
  "maxxed-compass",
  "maxxed-measure",
  "maxxed-gold-estimator",
  "fishing-maxxed",
  "rival-rush",
];
assert.deepEqual(apps.map((app) => app.slug), expectedAppSlugs, "Current Android apps must not be removed or reordered accidentally");

const existing = new Set(files.map((file) => `/${relative(siteRoot, file).split(sep).join("/")}`));
assert.ok(!existing.has("/admin/index.html"), "Public site export must not include the admin portal");
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

  const structuredDataBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(structuredDataBlocks.length >= 1, `${filePath} needs JSON-LD structured data`);
  for (const block of structuredDataBlocks) {
    const parsed = JSON.parse(block);
    assert.ok(parsed["@type"], `${filePath} JSON-LD block needs an @type`);
  }

  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  const isPublicPage = !filePath.startsWith("/admin/");
  if (isPublicPage) {
    assert.doesNotMatch(html, /href="(?:https:\/\/techmaxxed\.com)?\/admin(?:\/|")|href="\.\.\/admin(?:\/|")|href="\.\.\/\.\.\/admin(?:\/|")/, `${filePath} must not link to the admin portal`);
    assert.doesNotMatch(html, /Admin hub/, `${filePath} must not expose admin hub copy`);
    assert.doesNotMatch(html, /repo-backed|Repo-backed|repo products|Repo products|Powerhouse repo|powerhouse repo|standalone repos|plugin lab|artifact/i, `${filePath} contains internal-facing catalog language`);
    assert.doesNotMatch(html, /Release verification|release candidate|Internal testing|Active development/i, `${filePath} contains internal-facing release stage language`);
  }

  for (const reference of references) {
    if (/^(?:#|mailto:|tel:|https?:|data:)/.test(reference)) continue;
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
assert.doesNotMatch(betaPage, /beta@techmaxxed\.com/);
assert.match(betaPage, /support@techmaxxed\.com/);
assert.match(betaPage, /voluntary and unpaid/i);
assert.match(betaPage, /name="creditConsent"/);

for (const slug of ["maxxed-remote", "maxxed-compass", "maxxed-measure", "maxxed-gold-estimator", "fishing-maxxed", "rival-rush"]) {
  const readme = await readFile(resolve(siteRoot, `apps/${slug}/readme/index.html`), "utf8");
  assert.match(readme, /README/);
  assert.match(readme, /Support/);
  assert.match(readme, /Privacy/);
  assert.match(readme, /Pre-release Testing/);
  assert.match(readme, /at least once per week/);

  const policy = await readFile(resolve(siteRoot, `apps/${slug}/privacy/index.html`), "utf8");
  assert.match(policy, /Permissions and purpose/);
  assert.match(policy, /Retention/);
  assert.match(policy, /Deletion/);
  assert.match(policy, /Third-party services/);
  assert.doesNotMatch(policy, /privacy@techmaxxed\.com/);
  assert.match(policy, /support@techmaxxed\.com/);
}

for (const plugin of wordpressPlugins) {
  const detail = await readFile(resolve(siteRoot, `plugins/${plugin.slug}/index.html`), "utf8");
  assert.match(detail, new RegExp(plugin.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(detail, /Get plugin support/);
  assert.match(detail, /README/);
  assert.match(detail, /support@techmaxxed\.com/);

  const readme = await readFile(resolve(siteRoot, `plugins/${plugin.slug}/readme/index.html`), "utf8");
  assert.match(readme, /README/);
  assert.match(readme, /Support/);
  assert.match(readme, /Weekly Review/);
  assert.match(readme, /at least once per week/);
  assert.match(readme, /support@techmaxxed\.com/);
}

assert.match(await readFile(resolve(siteRoot, "terms/index.html"), "utf8"), /Beta participation/);
assert.match(await readFile(resolve(siteRoot, "beta-credits/index.html"), "utf8"), /Public credit is recognition, not compensation/);
assert.match(await readFile(resolve(siteRoot, "plugins/index.html"), "utf8"), /WordPress plugins/);
assert.equal(((await readFile(resolve(siteRoot, "apps/index.html"), "utf8")).match(/data-app-card/g) || []).length, 186, "Apps page should show 6 Android apps, 36 WordPress tools, 44 focused web tools, and 100 business tools");
assert.equal(((await readFile(resolve(siteRoot, "plugins/index.html"), "utf8")).match(/data-app-card/g) || []).length, 36, "Plugins page should show all 36 WordPress tools");

const sitemap = await readFile(resolve(siteRoot, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 250, "Sitemap should contain all 250 indexed public pages");
assert.match(await readFile(resolve(siteRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/techmaxxed\.com\/sitemap\.xml/);
JSON.parse(await readFile(resolve(siteRoot, "site.webmanifest"), "utf8"));

const support = await readFile(resolve(siteRoot, "support/index.html"), "utf8");
assert.match(support, /Prepare support ticket email/);
assert.match(support, /Request type/);
assert.match(support, /Privacy or data/);
assert.match(support, /Pre-release testing/);
assert.match(support, /data-support-form/);
assert.match(support, /WordPress Role Auditor/);
assert.match(support, /Support Desk Lite/);
assert.match(support, /Android utility apps/);
assert.match(support, /WordPress cleanup plugins/);
assert.match(support, /camera measurement apps/);
assert.match(support, /compass and outdoor tools/);
assert.match(support, /Android beta testing/);
const supportProductSelect = support.match(/<select id="support-app"[^>]*>([\s\S]*?)<\/select>/)?.[1] || "";
assert.equal((supportProductSelect.match(/<option value=/g) || []).length, 192, "Support page should include 186 products and six product-guide topics");
assert.doesNotMatch(support, /privacy@techmaxxed\.com|beta@techmaxxed\.com/);

const adminExisting = new Set(adminFiles.map((file) => `/${relative(adminRoot, file).split(sep).join("/")}`));
for (const file of adminFiles.filter((item) => extname(item) === ".html")) {
  const html = await readFile(file, "utf8");
  const filePath = `/${relative(adminRoot, file).split(sep).join("/")}`;
  const route = filePath.endsWith("/index.html") ? filePath.slice(0, -"index.html".length) : filePath;
  assert.match(html, /https:\/\/admin\.techmaxxed\.com\//, `${filePath} should use the admin subdomain canonical URL`);
  assert.doesNotMatch(html, /\.\.\/\.\.\/assets\//, `${filePath} should not point above the admin export for assets`);

  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:#|mailto:|tel:|https?:|data:)/.test(reference)) continue;
    if (reference.startsWith("/api/")) continue;
    const resolvedUrl = new URL(reference, `https://admin.example.test${route}`);
    let target = decodeURIComponent(resolvedUrl.pathname);
    if (target === "/") target = "/index.html";
    else if (target.endsWith("/")) target += "index.html";
    assert.ok(adminExisting.has(target), `${filePath} has a broken admin export reference: ${reference} -> ${target}`);
  }
}

assert.match(await readFile(resolve(adminRoot, "index.html"), "utf8"), /Testing Functions/);
assert.match(await readFile(resolve(adminRoot, "testing-functions/index.html"), "utf8"), /Testing Functions/);
assert.match(await readFile(resolve(adminRoot, "plugins/index.html"), "utf8"), /WordPress plugin admin/);
JSON.parse(await readFile(resolve(adminRoot, "site.webmanifest"), "utf8"));

console.log(`Validated ${htmlFiles.length} HTML pages, ${checkedReferences} local references, admin subdomain export, unique metadata, sitemap, manifest, and client JavaScript.`);
