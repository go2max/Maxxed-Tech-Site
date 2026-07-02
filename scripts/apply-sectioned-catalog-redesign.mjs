import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, site, wordpressPlugins } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");
const allTools = [...repoProducts, ...powerhouseProducts];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const appBySlug = new Map(apps.map((app) => [app.slug, app]));
const appGroups = [
  ["Control & Utility", "TV control, everyday utilities, and quick jobs that should stay simple.", ["maxxed-remote"]],
  ["Navigation & Field Tools", "Outdoor, compass, catch record, and field-use products that need real-device testing.", ["maxxed-compass", "fishing-maxxed"]],
  ["Measurement & Estimation", "Camera-assisted measuring and visual estimate tools with clear uncertainty and limitations.", ["maxxed-measure", "maxxed-gold-estimator"]],
  ["Games", "Lightweight entertainment products and party-game experiments.", ["rival-rush"]],
];

const pluginGroups = [
  ["Accessibility & Compliance", "Accessibility, legal, disclosure, roles, security, and risk-review workflows.", /accessibility|alt|legal|license|role|security|fraud|compliance|disclosure/],
  ["Maintenance & Cleanup", "Stale content, redirects, duplicate media, shortcodes, database, and maintenance reporting.", /cleanup|duplicate|purge|stale|orphan|redirect|shortcode|maintenance|uptime|database/],
  ["Commerce Operations", "WooCommerce, products, pricing, stock, suppliers, shipping, orders, returns, and margin review.", /price|stock|order|returns|shipping|supplier|woocommerce|margin|product/],
  ["Content & Client Workflow", "Content approval, client portals, galleries, scheduled expiration, forms, and publishing support.", /content|approval|client|gallery|scheduled|form|website/],
  ["Local SEO & Schema", "Service area, local business schema, NAP consistency, and local search operations.", /schema|nap|service-area|local/],
];

const toolGroups = [
  ["Business", "Business workflow, intake, project, customer, and operations tools.", "business"],
  ["Finance", "Receipts, costs, savings, subscriptions, tax, and money-decision helpers.", "finance"],
  ["Content", "Documents, pages, metadata, approvals, and publishing utilities.", "content"],
  ["Civic & Community", "Neighborhood, public records, local coordination, and civic workflow concepts.", "civic"],
];

function replaceMain(html, body) {
  return html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${body}</main>`);
}

function replaceMeta(html, title, description, canonicalPath) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)} | ${escapeHtml(site.name)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${site.url}/${canonicalPath}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${site.url}/${canonicalPath}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
}

function appCard(app) {
  return `<a class="app-card section-card" data-app-card data-category="${escapeHtml(app.categoryKey)}" style="--accent:${escapeHtml(app.accent)}" href="${app.slug}/"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><h3>${escapeHtml(app.name)}</h3><p>${escapeHtml(app.summary)}</p><div class="fact-row">${app.facts.slice(0, 4).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">Open app page →</span></a>`;
}

function pluginCard(plugin) {
  return `<a class="app-card section-card" data-app-card data-category="wordpress" style="--accent:${escapeHtml(plugin.accent)}" href="${plugin.slug}/"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div><h3>${escapeHtml(plugin.name)}</h3><p>${escapeHtml(plugin.summary)}</p><div class="fact-row">${plugin.facts.slice(0, 3).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">Open plugin page →</span></a>`;
}

function groupIntroCards(groups) {
  return groups.map(([title, text]) => `<article class="section-lane-card"><span class="status">Section</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("");
}

function appGroupSection([title, text, slugs]) {
  const groupApps = slugs.map((slug) => appBySlug.get(slug)).filter(Boolean);
  if (!groupApps.length) return "";
  return `<section class="catalog-section"><div class="section-head"><div><p class="eyebrow">${escapeHtml(title)}</p><h2>${escapeHtml(title)}</h2></div><p>${escapeHtml(text)}</p></div><div class="app-grid">${groupApps.map(appCard).join("")}</div></section>`;
}

function pluginCategoryCard([title, text, pattern]) {
  const count = wordpressPlugins.filter((plugin) => pattern.test(plugin.slug)).length;
  return `<article class="section-lane-card"><span class="status">${count} tools</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`;
}

function toolCategoryCard([title, text, key]) {
  const count = allTools.filter((tool) => tool.categoryKey.includes(key)).length;
  return `<article class="section-lane-card"><span class="status">${count} tools</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`;
}

function appsBody() {
  return `<section class="band section-hero"><div class="shell section compact"><p class="eyebrow">Apps</p><h1>Android apps by product lane</h1><p class="lede">Apps now stay in their own section instead of sharing one overloaded catalog with plugins and tool concepts. Each app has a product page, README, privacy policy, beta route, and support path.</p><div class="proof-row"><span>${apps.length} Android apps</span><span>Platform badges</span><span>Beta request paths</span><span>Clear release states</span></div><div class="hero-actions"><a class="button" href="../beta/">Request beta access</a><a class="button secondary" href="../custom-orders/">Order custom app work</a><a class="button secondary" href="../plugins/">Browse plugins</a></div></div></section>
  <section class="shell section compact"><div class="section-lane-grid">${groupIntroCards(appGroups)}</div></section>
  <section class="shell section compact"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search apps</span><input type="search" data-app-search placeholder="Search apps by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter apps"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="utility" aria-pressed="false">Utilities</button><button class="filter" data-filter="outdoors" aria-pressed="false">Outdoors</button><button class="filter" data-filter="games" aria-pressed="false">Games</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><p class="empty-state" data-empty-state hidden>No apps match that search. Try a product name or broader app type.</p></section>
  <section class="shell section catalog-section" data-catalog>${appGroups.map(appGroupSection).join("")}</section>
  <section class="band"><div class="shell section compact"><div class="order-panel"><div><p class="eyebrow">Cross-platform later</p><h2>Product pages carry platform badges.</h2><p>The main structure stays Apps, Plugins, Tools, and Custom Orders. When products become Android + web + iOS later, the individual product page can show platform availability without duplicating the whole site structure.</p></div><div class="hero-actions"><a class="button" href="../custom-orders/">Request a build</a><a class="button secondary" href="../tools/">Browse tools</a></div></div></div></section>`;
}

function pluginsBody() {
  return `<section class="band section-hero"><div class="shell section compact"><p class="eyebrow">Plugins</p><h1>WordPress plugins by workflow lane</h1><p class="lede">WordPress products are grouped by business workflow so they feel like installable, orderable tools rather than a flat list of concepts.</p><div class="proof-row"><span>${wordpressPlugins.length} WordPress tools</span><span>Review-first workflows</span><span>Support routing</span><span>Setup/order paths</span></div><div class="hero-actions"><a class="button" href="../custom-orders/">Order plugin work</a><a class="button secondary" href="../pricing/">View pricing</a><a class="button secondary" href="../support/?app=WordPress%20plugin&issue=Feature%20request">Ask which plugin fits</a></div></div></section>
  <section class="shell section compact"><div class="section-lane-grid">${pluginGroups.map(pluginCategoryCard).join("")}</div></section>
  <section class="shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search plugins</span><input type="search" data-app-search placeholder="Search plugins by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter plugins"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><div class="app-grid" data-catalog>${wordpressPlugins.map(pluginCard).join("")}</div><p class="empty-state" data-empty-state hidden>No plugins match that search. Try a plugin name or broader capability.</p></section>`;
}

function toolsBodyPatch(html) {
  const insert = `<section class="shell section compact"><div class="section-lane-grid">${toolGroups.map(toolCategoryCard).join("")}</div></section>`;
  return html.replace(/<section class="shell section compact"><div class="catalog-tools">/, `${insert}<section class="shell section compact"><div class="catalog-tools">`);
}

const appsPath = resolve(siteRoot, "apps/index.html");
let appsHtml = await readFile(appsPath, "utf8");
appsHtml = replaceMeta(replaceMain(appsHtml, appsBody()), "Apps", "Browse Maxxed Android apps grouped by product lane, with beta access, support, privacy, README, and custom app ordering paths.", "apps/");
await writeFile(appsPath, appsHtml, "utf8");

const pluginsPath = resolve(siteRoot, "plugins/index.html");
let pluginsHtml = await readFile(pluginsPath, "utf8");
pluginsHtml = replaceMeta(replaceMain(pluginsHtml, pluginsBody()), "WordPress Plugins", "Browse Maxxed WordPress plugins grouped by workflow lane with setup, support, ordering, and review-first product paths.", "plugins/");
await writeFile(pluginsPath, pluginsHtml, "utf8");

const toolsPath = resolve(siteRoot, "tools/index.html");
try {
  let toolsHtml = await readFile(toolsPath, "utf8");
  toolsHtml = toolsBodyPatch(toolsHtml);
  await writeFile(toolsPath, toolsHtml, "utf8");
} catch {
  // The homepage redesign pass creates /tools/. If it changes later, this pass can be safely skipped.
}

let css = await readFile(cssPath, "utf8");
if (!css.includes("/* Sectioned catalog redesign */")) {
  css += `

/* Sectioned catalog redesign */
.section-hero {
  background:
    radial-gradient(circle at 12% 10%, rgba(185, 237, 69, 0.12), transparent 28%),
    linear-gradient(135deg, rgba(37, 208, 216, 0.1), transparent 55%);
}
.section-hero h1 { max-width: 840px; letter-spacing: -0.045em; }
.section-lane-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.section-lane-card {
  min-height: 220px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
}
.section-lane-card h3 { margin-top: 22px; font-size: clamp(22px, 2.4vw, 28px); }
.section-lane-card p { margin-bottom: 0; color: var(--muted); font-size: 14px; }
.section-card { border-radius: 16px; }
.catalog-section + .catalog-section { margin-top: clamp(44px, 6vw, 72px); }
.catalog-section[data-catalog] > .catalog-section { margin-bottom: clamp(44px, 6vw, 72px); }
.catalog-section[data-catalog] > .catalog-section:last-child { margin-bottom: 0; }
@media (max-width: 1080px) { .section-lane-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .section-lane-grid { grid-template-columns: 1fr; } .section-lane-card { min-height: auto; } }
`;
  await writeFile(cssPath, css, "utf8");
}
