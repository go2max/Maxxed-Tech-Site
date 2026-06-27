import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
assert.equal(htmlFiles.length, 26, "Expected 23 indexed HTML pages, two admin pages, and one 404 page");

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

assert.match(await readFile(resolve(siteRoot, "terms/index.html"), "utf8"), /Beta participation/);
assert.match(await readFile(resolve(siteRoot, "beta-credits/index.html"), "utf8"), /Public credit is recognition, not compensation/);
assert.match(await readFile(resolve(siteRoot, "admin/index.html"), "utf8"), /Maxxed admin routing/);
assert.match(await readFile(resolve(siteRoot, "admin/plugins/index.html"), "utf8"), /WordPress plugin admin/);
assert.match(await readFile(resolve(siteRoot, "plugins/index.html"), "utf8"), /WordPress plugins/);
assert.equal(((await readFile(resolve(siteRoot, "apps/index.html"), "utf8")).match(/data-app-card/g) || []).length, 186, "Apps page should show 6 Android apps, 36 WordPress plugins, 44 standalone repos, and 100 powerhouse repos");
assert.equal(((await readFile(resolve(siteRoot, "plugins/index.html"), "utf8")).match(/data-app-card/g) || []).length, 36, "Plugins page should show all 36 WordPress plugins");

const sitemap = await readFile(resolve(siteRoot, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 23, "Sitemap should contain all 23 indexed pages");
assert.match(await readFile(resolve(siteRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/techmaxxed\.com\/sitemap\.xml/);
JSON.parse(await readFile(resolve(siteRoot, "site.webmanifest"), "utf8"));

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
    const resolvedUrl = new URL(reference, `https://admin.example.test${route}`);
    let target = decodeURIComponent(resolvedUrl.pathname);
    if (target === "/") target = "/index.html";
    else if (target.endsWith("/")) target += "index.html";
    assert.ok(adminExisting.has(target), `${filePath} has a broken admin export reference: ${reference} -> ${target}`);
  }
}

assert.match(await readFile(resolve(adminRoot, "index.html"), "utf8"), /Maxxed admin routing/);
assert.match(await readFile(resolve(adminRoot, "plugins/index.html"), "utf8"), /WordPress plugin admin/);
JSON.parse(await readFile(resolve(adminRoot, "site.webmanifest"), "utf8"));

console.log(`Validated ${htmlFiles.length} HTML pages, ${checkedReferences} local references, admin subdomain export, unique metadata, sitemap, manifest, and client JavaScript.`);
