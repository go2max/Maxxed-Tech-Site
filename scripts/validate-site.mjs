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
assert.equal(htmlFiles.length, 255, "Expected 254 indexed public HTML pages and one 404 page");
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

  const primaryNav = html.match(/<nav class="nav-links" id="primary-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(primaryNav, `${filePath} needs the public primary navigation`);
  assert.match(primaryNav, />\s*Apps\s*</, `${filePath} public primary navigation should include Apps`);
  assert.match(primaryNav, />\s*Plugins\s*</, `${filePath} public primary navigation should include Plugins`);
  assert.match(primaryNav, />\s*Tools\s*</, `${filePath} public primary navigation should include Tools`);
  assert.match(primaryNav, />\s*Custom Orders\s*</, `${filePath} public primary navigation should include Custom Orders`);
  assert.match(primaryNav, /Start an Order/, `${filePath} public primary navigation should include Start an Order CTA`);
  assert.doesNotMatch(primaryNav, />\s*Admin\s*</, `${filePath} public primary navigation must not include Admin`);
  assert.doesNotMatch(primaryNav, /href="[^"]*admin/i, `${filePath} public primary navigation must not link to admin`);

  const images = [...html.matchAll(/<img\b([^>]*)>/g)].map((match) => match[1]);
  for (const attrs of images) {
    assert.match(attrs, /\salt="[^"]*"/, `${filePath} has an image without alt text`);
  }

  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  for (const [, attrs, label] of buttons) {
    const hasAriaLabel = /\saria-label="[^"]+"/.test(attrs);
    const text = label.replace(/<[^>]*>/g, "").trim();
    assert.ok(hasAriaLabel || text, `${filePath} has a button without an accessible name`);
  }

  const controls = [...html.matchAll(/<(?:input|select|textarea)\b([^>]*)>/g)].map((match) => match[1]);
  for (const attrs of controls) {
    if (/\stype="(?:hidden|checkbox|radio)"/.test(attrs)) continue;
    if (/\sdata-app-search\b/.test(attrs)) continue;
    const id = attrs.match(/\sid="([^"]+)"/)?.[1];
    assert.ok(id, `${filePath} has a form control without an id`);
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `${filePath} has an unlabeled form control: ${id}`);
  }

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
assert.match(betaPage, /You can request apps still in development\./);
assert.match(betaPage, /Pre-release requests/);

for (const slug of ["maxxed-remote", "maxxed-compass", "maxxed-measure", "maxxed-gold-estimator", "fishing-maxxed", "rival-rush"]) {
  const detail = await readFile(resolve(siteRoot, `apps/${slug}/index.html`), "utf8");
  assert.match(detail, /product-conversion-panel/);
  assert.match(detail, /Request beta access/);
  assert.match(detail, /Order related app work/);

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
  assert.match(detail, /product-conversion-panel/);
  assert.match(detail, /Order plugin work/);

  const readme = await readFile(resolve(siteRoot, `plugins/${plugin.slug}/readme/index.html`), "utf8");
  assert.match(readme, /README/);
  assert.match(readme, /Support/);
  assert.match(readme, /Weekly Review/);
  assert.match(readme, /at least once per week/);
  assert.match(readme, /support@techmaxxed\.com/);
}

assert.match(await readFile(resolve(siteRoot, "terms/index.html"), "utf8"), /Beta participation/);
assert.match(await readFile(resolve(siteRoot, "terms/index.html"), "utf8"), /Purchases and fulfillment/);
assert.match(await readFile(resolve(siteRoot, "privacy/index.html"), "utf8"), /Purchases and checkout/);
const pricing = await readFile(resolve(siteRoot, "pricing/index.html"), "utf8");
assert.match(pricing, /Buy Maxxed apps and tools/);
assert.match(pricing, /Start checkout/);
assert.match(pricing, /Need a quote instead of a listed product\?/);
assert.match(pricing, /Start custom order/);
const checkout = await readFile(resolve(siteRoot, "checkout/index.html"), "utf8");
assert.match(checkout, /No card fields on this site/);
assert.match(checkout, /Request invoice|Continue to hosted checkout/);
assert.match(checkout, /checkout-offers/);
assert.match(await readFile(resolve(siteRoot, "beta-credits/index.html"), "utf8"), /Public credit is recognition, not compensation/);

const home = await readFile(resolve(siteRoot, "index.html"), "utf8");
assert.match(home, /Practical software for real-world workflows\./);
assert.match(home, /Start a Custom Order/);
assert.match(home, /Built by Max Uland/);
assert.match(home, /Direct ordering/);

const appsIndex = await readFile(resolve(siteRoot, "apps/index.html"), "utf8");
assert.match(appsIndex, /Android apps by product lane/);
assert.match(appsIndex, /Control &amp; Utility/);
assert.match(appsIndex, /Navigation &amp; Field Tools/);
assert.match(appsIndex, /Measurement &amp; Estimation/);
assert.match(appsIndex, /Games/);
assert.equal((appsIndex.match(/data-app-card/g) || []).length, 6, "Apps page should show the six Android apps only");

const pluginsIndex = await readFile(resolve(siteRoot, "plugins/index.html"), "utf8");
assert.match(pluginsIndex, /WordPress plugins by workflow lane/);
assert.match(pluginsIndex, /Accessibility &amp; Compliance/);
assert.match(pluginsIndex, /Maintenance &amp; Cleanup/);
assert.match(pluginsIndex, /Commerce Operations/);
assert.equal((pluginsIndex.match(/data-app-card/g) || []).length, 36, "Plugins page should show all 36 WordPress tools");

const toolsIndex = await readFile(resolve(siteRoot, "tools/index.html"), "utf8");
assert.match(toolsIndex, /Software tools and product concepts/);
assert.match(toolsIndex, /Business/);
assert.match(toolsIndex, /Finance/);
assert.match(toolsIndex, /Content/);
assert.match(toolsIndex, /Civic &amp; Community/);
assert.ok((toolsIndex.match(/data-app-card/g) || []).length >= 24, "Tools page should render a requestable sample of tool concepts");

const customOrders = await readFile(resolve(siteRoot, "custom-orders/index.html"), "utf8");
assert.match(customOrders, /Order a custom app, plugin, automation, or workflow tool\./);
assert.match(customOrders, /Max Uland reviews custom requests/);
assert.match(customOrders, /What can be built/);
assert.match(customOrders, /What to include in the request/);

const about = await readFile(resolve(siteRoot, "about/index.html"), "utf8");
assert.match(about, /Independent software built by Max Uland\./);
assert.match(about, /Maxxed Technical Systems is a practical software studio/);
assert.match(about, /Order custom work/);

const sitemap = await readFile(resolve(siteRoot, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 254, "Sitemap should contain all 254 indexed public pages");
assert.match(sitemap, /https:\/\/techmaxxed\.com\/custom-orders\//);
assert.match(sitemap, /https:\/\/techmaxxed\.com\/tools\//);
assert.match(await readFile(resolve(siteRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/techmaxxed\.com\/sitemap\.xml/);
JSON.parse(await readFile(resolve(siteRoot, "site.webmanifest"), "utf8"));

const support = await readFile(resolve(siteRoot, "support/index.html"), "utf8");
assert.match(support, /Get help, request testing, or ask about a build\./);
assert.match(support, /App issue/);
assert.match(support, /Beta access/);
assert.match(support, /Plugin help/);
assert.match(support, /Custom work/);
assert.match(support, /Prepare support email/);
assert.match(support, /Request type/);
assert.match(support, /Privacy or data/);
assert.match(support, /Pre-release testing/);
assert.match(support, /Custom order question/);
assert.match(support, /data-support-form/);
assert.match(support, /Custom software order/);
assert.match(support, /Pricing question/);
const supportProductSelect = support.match(/<select id="support-product-polish"[^>]*>([\s\S]*?)<\/select>/)?.[1] || "";
assert.equal((supportProductSelect.match(/<option>/g) || []).length, 33, "Support page should include general guidance, six apps, 24 highlighted plugins, and two business routes");
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

const adminHome = await readFile(resolve(adminRoot, "index.html"), "utf8");
assert.match(adminHome, /Admin control center/);
assert.match(adminHome, /\/testing-functions\//);
assert.match(await readFile(resolve(adminRoot, "testing-functions/index.html"), "utf8"), /Testing Functions/);
const adminPlugins = await readFile(resolve(adminRoot, "plugins/index.html"), "utf8");
assert.match(adminPlugins, /WordPress plugin package review/);
assert.doesNotMatch(adminPlugins, /Settings\s*[-&>]/);
assert.doesNotMatch(adminPlugins, /Settings Profile|Test Profile/);
const adminProductRegistry = JSON.parse(await readFile(resolve(adminRoot, "data/product-registry.json"), "utf8"));
assert.equal(adminProductRegistry.products.length, 187, "Admin catalog should include 186 public products plus Aspiration");
assert.ok(adminProductRegistry.products.some((product) => product.id === "aspiration" && product.route === "/products/aspiration/"), "Admin catalog must include the Aspiration app route");
const adminProducts = await readFile(resolve(adminRoot, "products/index.html"), "utf8");
assert.equal((adminProducts.match(/data-app-card/g) || []).length, 187, "Admin products page should render the full admin catalog");
assert.match(adminProducts, /Aspiration/);
assert.match(await readFile(resolve(adminRoot, "products/aspiration/index.html"), "utf8"), /Aspiration/);
JSON.parse(await readFile(resolve(adminRoot, "site.webmanifest"), "utf8"));

console.log(`Validated ${htmlFiles.length} HTML pages, ${checkedReferences} local references, redesigned public routes, admin subdomain export, unique metadata, sitemap, manifest, and client JavaScript.`);
