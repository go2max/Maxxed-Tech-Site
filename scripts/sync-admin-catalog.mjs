import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, site, wordpressPlugins } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const adminOutput = resolve(root, "admin");
const today = "2026-07-01";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const adminOnlyProducts = [
  {
    slug: "aspiration",
    name: "Aspiration",
    status: "Admin tracked",
    family: "Upcoming app",
    summary: "Admin-tracked aspiration planning app entry reserved for product scoping, routing, and future build review.",
    route: "/products/aspiration/",
    publicRoute: null,
  },
];

function adminCatalogRecords() {
  const appRecords = apps.map((app) => ({
    id: app.slug,
    name: app.name,
    route: `/products/${app.slug}/`,
    publicRoute: `https://techmaxxed.com/apps/${app.slug}/`,
    state: app.status,
    family: "Android app",
    summary: app.summary,
    supportEmail: site.email,
  }));
  const pluginRecords = wordpressPlugins.map((plugin) => ({
    id: plugin.slug,
    name: plugin.name,
    route: `https://techmaxxed.com/plugins/${plugin.slug}/`,
    publicRoute: `https://techmaxxed.com/plugins/${plugin.slug}/`,
    state: plugin.status,
    family: "WordPress plugin",
    summary: plugin.summary,
    supportEmail: site.email,
  }));
  const toolRecords = repoProducts.map((product) => ({
    id: product.slug,
    name: product.name,
    route: `https://techmaxxed.com/tools/${product.slug}/`,
    publicRoute: `https://techmaxxed.com/tools/${product.slug}/`,
    state: product.status,
    family: "Focused web tool",
    summary: product.summary,
    supportEmail: site.email,
  }));
  const businessRecords = powerhouseProducts.map((product) => ({
    id: product.slug,
    name: product.name,
    route: `https://techmaxxed.com/tools/${product.slug}/`,
    publicRoute: `https://techmaxxed.com/tools/${product.slug}/`,
    state: product.status,
    family: "Business tool",
    summary: product.summary,
    supportEmail: site.email,
  }));
  const adminOnlyRecords = adminOnlyProducts.map((product) => ({
    id: product.slug,
    name: product.name,
    route: product.route,
    publicRoute: product.publicRoute,
    state: product.status,
    family: product.family,
    summary: product.summary,
    supportEmail: site.email,
  }));
  return [...appRecords, ...pluginRecords, ...toolRecords, ...businessRecords, ...adminOnlyRecords]
    .sort((left, right) => left.name.localeCompare(right.name));
}

function adminHeader(current = "") {
  const link = (href, label, id) => `<a href="${href}"${current === id ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header"><div class="nav-shell"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">MTS</span><span class="brand-name">Maxxed Admin</span></a><nav class="nav-links" aria-label="Admin navigation">${link("/", "Home", "home")}${link("/products/", "Products", "products")}${link("/operations/", "Operations", "operations")}${link("/testing-functions/", "Testing", "testing")}${link("/plugins/", "Plugins", "plugins")}${link("/docs/", "Docs", "docs")}</nav></div></header>`;
}

function adminLayout({ title, description, path, current, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Maxxed Admin</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex,nofollow">
  <link rel="canonical" href="https://admin.techmaxxed.com/${path}">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body>
  ${adminHeader(current)}
  <main id="main">${body}</main>
  <script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

function productCard(product) {
  return `<a class="admin-product-card" data-app-card data-category="${escapeHtml(product.family.toLowerCase())}" href="${escapeHtml(product.route)}"><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.summary)}</p><div class="admin-meta"><span class="admin-pill">${escapeHtml(product.family)}</span><span class="admin-pill">${escapeHtml(product.state)}</span></div></a>`;
}

function productsPage(products) {
  const body = `
    <section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Product registry</p><h1>Admin product catalog</h1><p class="lede">A private admin copy of the Maxxed catalog, including public products plus admin-tracked upcoming items such as Aspiration.</p><div class="proof-row"><span>${products.length} admin catalog entries</span><span>${apps.length} Android apps</span><span>${wordpressPlugins.length} WordPress tools</span><span>${repoProducts.length + powerhouseProducts.length} web and business tools</span></div></div></section>
    <section class="admin-shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search admin catalog</span><input type="search" data-app-search placeholder="Search products, plugins, tools, or status" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter admin catalog"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="android" aria-pressed="false">Android</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button><button class="filter" data-filter="focused" aria-pressed="false">Web tools</button><button class="filter" data-filter="business" aria-pressed="false">Business</button><button class="filter" data-filter="upcoming" aria-pressed="false">Upcoming</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><p class="empty-state" data-empty-state hidden>No admin catalog entries match that search.</p><div class="admin-product-grid" data-catalog>${products.map(productCard).join("")}</div><p class="fine-print">Source data: <span class="admin-code">/data/product-registry.json</span>. Public product links intentionally leave the admin subdomain; admin-only products stay inside this portal.</p></section>`;
  return adminLayout({
    title: "Products",
    description: "Private admin copy of the Maxxed product catalog with public products and admin-tracked upcoming app entries.",
    path: "products/",
    current: "products",
    body,
  });
}

function aspirationPage() {
  const body = `<section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Upcoming app</p><h1>Aspiration</h1><p class="lede">Admin-tracked aspiration planning app entry for product scoping, routing, and future build review.</p><div class="proof-row"><span>Admin tracked</span><span>Upcoming app</span><span>support@techmaxxed.com</span></div></div></section>
    <section class="admin-shell section"><div class="admin-list"><article><h2>Current intent</h2><p>Keep Aspiration visible in the admin catalog while the public product page and build scope are still being defined.</p></article><article><h2>Routing</h2><p><a class="button small" href="/products/">Back to product catalog</a> <a class="button secondary small" href="mailto:${site.email}?subject=${encodeURIComponent("Aspiration app planning")}">Email planning notes</a></p></article></div></section>`;
  return adminLayout({
    title: "Aspiration",
    description: "Admin-tracked Aspiration app route for product scoping and future build review.",
    path: "products/aspiration/",
    current: "products",
    body,
  });
}

async function writeAdmin(path, contents) {
  const destination = resolve(adminOutput, path);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

const products = adminCatalogRecords();
await writeAdmin("data/product-registry.json", `${JSON.stringify({ version: 2, updatedAt: today, products }, null, 2)}\n`);
await writeAdmin("products/index.html", productsPage(products));
await writeAdmin("products/aspiration/index.html", aspirationPage());

console.log(`Synced ${products.length} admin catalog products, including Aspiration.`);
