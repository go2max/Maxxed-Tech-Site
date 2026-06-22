import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
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
assert.equal(htmlFiles.length, 14, "Expected 13 indexed HTML pages and one 404 page");

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
  if (filePath !== "/404.html") assert.match(html, /<link rel="canonical" href="https:\/\/maxxedtechnicalsystems\.com\//, `${filePath} needs a canonical URL`);

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

const sitemap = await readFile(resolve(siteRoot, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 13, "Sitemap should contain all 13 indexed pages");
assert.match(await readFile(resolve(siteRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/maxxedtechnicalsystems\.com\/sitemap\.xml/);
JSON.parse(await readFile(resolve(siteRoot, "site.webmanifest"), "utf8"));

console.log(`Validated ${htmlFiles.length} HTML pages, ${checkedReferences} local references, unique metadata, sitemap, manifest, and client JavaScript.`);
