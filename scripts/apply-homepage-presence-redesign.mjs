import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, roadmap, site, wordpressPlugins } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");
const allTools = [...repoProducts, ...powerhouseProducts];
const allProducts = [...apps, ...wordpressPlugins, ...allTools];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const link = (depth, path = "") => `${"../".repeat(depth)}${path}`;
const canonical = (path = "") => `${site.url}/${path}`;
const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const depthForFile = (filePath) => {
  const rel = relative(siteRoot, filePath).split(sep).join("/");
  const folder = rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : dirname(rel);
  return folder.split("/").filter(Boolean).length;
};
const currentForFile = (filePath) => {
  const rel = relative(siteRoot, filePath).split(sep).join("/");
  if (rel === "index.html") return "home";
  if (rel.startsWith("apps/")) return "apps";
  if (rel.startsWith("plugins/")) return "plugins";
  if (rel.startsWith("tools/")) return "tools";
  if (rel.startsWith("custom-orders/")) return "custom-orders";
  if (rel.startsWith("beta") || rel.startsWith("beta-")) return "beta";
  if (rel.startsWith("about/")) return "about";
  return "";
};

function header(depth, current = "") {
  const nav = [
    ["apps", "Apps", "apps/"],
    ["plugins", "Plugins", "plugins/"],
    ["tools", "Tools", "tools/"],
    ["custom-orders", "Custom Orders", "custom-orders/"],
    ["beta", "Beta Testing", "beta/"],
    ["about", "About", "about/"],
  ];
  return `<header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="${link(depth)}" aria-label="Maxxed Technical Systems home"><span class="brand-mark" aria-hidden="true">MTS</span><span class="brand-name">Maxxed Technical Systems</span></a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation">☰</button>
      <nav class="nav-links" id="primary-nav" data-nav-links data-open="false" aria-label="Primary navigation">
        ${nav.map(([key, label, path]) => `<a href="${link(depth, path)}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
        <a class="nav-button" href="${link(depth, "custom-orders/")}">Start an Order</a>
      </nav>
    </div>
  </header>`;
}

function footer(depth) {
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div><a class="brand" href="${link(depth)}"><span class="brand-mark" aria-hidden="true">MTS</span><span>Maxxed Technical Systems</span></a><p>Practical apps, plugins, and custom software tools for real-world workflows.</p><p class="founder-line">Developed by Max Uland under Maxxed Technical Systems.</p></div>
      <div><h2>Products</h2><ul><li><a href="${link(depth, "apps/")}">Apps</a></li><li><a href="${link(depth, "plugins/")}">Plugins</a></li><li><a href="${link(depth, "tools/")}">Tools</a></li><li><a href="${link(depth, "pricing/")}">Pricing</a></li><li><a href="${link(depth, "checkout/")}">Checkout</a></li></ul></div>
      <div><h2>Services</h2><ul><li><a href="${link(depth, "custom-orders/")}">Custom orders</a></li><li><a href="${link(depth, "beta/")}">Beta testing</a></li><li><a href="${link(depth, "beta-credits/")}">Tester credits</a></li><li><a href="${link(depth, "support/")}">Support</a></li></ul></div>
      <div><h2>Company</h2><ul><li><a href="${link(depth, "about/")}">About</a></li><li><a href="${link(depth, "roadmap/")}">Roadmap</a></li><li><a href="${link(depth, "privacy/")}">Privacy</a></li><li><a href="${link(depth, "terms/")}">Terms</a></li><li><a href="${link(depth, "accessibility/")}">Accessibility</a></li><li><a href="mailto:${site.email}">Email us</a></li></ul></div>
    </div>
    <div class="shell footer-bottom">© <span data-year></span> Maxxed Technical Systems. Product availability, compatibility, and custom-build scope vary by product.</div>
  </footer>`;
}

function productMini(app) {
  return `<a class="product-stack-card" style="--accent:${escapeHtml(app.accent)}" href="apps/${app.slug}/"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.status)} · ${escapeHtml(app.category)}</small></span></a>`;
}

function appCard(app, depth = 0) {
  return `<a class="app-card presence-card" data-app-card data-category="${escapeHtml(app.categoryKey)}" style="--accent:${escapeHtml(app.accent)}" href="${link(depth, `apps/${app.slug}/`)}"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><h3>${escapeHtml(app.name)}</h3><p>${escapeHtml(app.summary)}</p><div class="fact-row">${app.facts.slice(0, 3).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">View details →</span></a>`;
}

function pluginCard(plugin, depth = 0) {
  return `<a class="app-card presence-card" data-app-card data-category="wordpress" style="--accent:${escapeHtml(plugin.accent)}" href="${link(depth, `plugins/${plugin.slug}/`)}"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div><h3>${escapeHtml(plugin.name)}</h3><p>${escapeHtml(plugin.summary)}</p><div class="fact-row">${plugin.facts.slice(0, 3).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">View plugin →</span></a>`;
}

function toolCard(product, depth = 0) {
  return `<a class="app-card presence-card" data-app-card data-category="${escapeHtml(product.categoryKey)}" style="--accent:${escapeHtml(product.accent)}" href="${link(depth, `tools/${product.slug}/`)}"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(product.icon)}</span><span class="status">${escapeHtml(product.status)}</span></div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.summary)}</p><div class="fact-row">${product.facts.slice(0, 3).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">Discuss or build →</span></a>`;
}

const pathCards = [
  ["Explore Apps", "Mobile-first tools for control, measurement, field records, navigation, and lightweight games.", "apps/", "Open apps", "Android first"],
  ["Browse Plugins", "WordPress workflow tools for maintenance, accessibility, cleanup, content, and operations.", "plugins/", "Open plugins", "WordPress tools"],
  ["View Tools", "Focused software concepts and utilities available for discussion, testing, or build-out.", "tools/", "Open tools", "Workflow utilities"],
  ["Order Custom Work", "Request a custom app, plugin, automation, dashboard, landing page, MVP, or rebuild.", "custom-orders/", "Start an order", "Direct ordering"],
];

function homeBody() {
  const featured = apps.slice(0, 6);
  const pluginHighlights = wordpressPlugins.slice(0, 3);
  const toolHighlights = allTools.slice(0, 3);
  return `<section class="band home-hero presence-hero"><div class="shell home-hero-grid"><div><p class="eyebrow">Apps · Plugins · Custom Software</p><h1>Practical software for real-world workflows.</h1><p class="lede">Maxxed Technical Systems builds Android apps, WordPress tools, focused web utilities, and custom software systems with clear release states, privacy-conscious defaults, and direct ordering.</p><div class="hero-actions"><a class="button" href="custom-orders/">Start a Custom Order</a><a class="button secondary" href="apps/">Explore Apps</a><a class="button secondary" href="plugins/">Browse Plugins</a></div><div class="founder-badge">Built by Max Uland · Maxxed Technical Systems</div></div><div class="presence-console" aria-label="Maxxed product paths"><div class="console-top"><span>Current build paths</span><strong>${allProducts.length} public entries</strong></div><div class="product-stack">${featured.map(productMini).join("")}</div></div></div></section>
  <section class="shell section compact"><div class="path-grid">${pathCards.map(([title, text, href, action, badge]) => `<a class="path-card" href="${href}"><span class="status">${badge}</span><h2>${title}</h2><p>${text}</p><strong>${action} →</strong></a>`).join("")}</div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Featured apps</p><h2>Android products with clear testing paths</h2></div><p>Only the strongest app lineup belongs this high on the page. The full catalog stays available deeper in the site.</p></div><div class="app-grid">${featured.map((app) => appCard(app, 0)).join("")}</div><div class="hero-actions"><a class="button secondary" href="apps/">View all apps</a><a class="button secondary" href="beta/">Request beta access</a></div></section>
  <section class="band order-band"><div class="shell section compact"><div class="order-panel"><div><p class="eyebrow">Direct ordering</p><h2>Need something built?</h2><p>Request a custom app, plugin, automation, dashboard, site tool, MVP prototype, or cleanup pass. The order path collects the scope details needed to quote or recommend the next move.</p></div><div class="hero-actions"><a class="button" href="custom-orders/">Start a Custom Order</a><a class="button secondary" href="support/?app=Custom%20software&issue=Feature%20request">Ask before ordering</a></div></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Plugins and tools</p><h2>Separate lanes, stronger discovery</h2></div><p>Apps, plugins, and tool concepts are now visually separated so cross-platform growth does not collapse into one overloaded product list.</p></div><div class="app-grid">${pluginHighlights.map((plugin) => pluginCard(plugin, 0)).join("")}${toolHighlights.map((product) => toolCard(product, 0)).join("")}</div><div class="hero-actions"><a class="button secondary" href="plugins/">Browse plugins</a><a class="button secondary" href="tools/">Browse tools</a></div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Build philosophy</p><h2>Useful before flashy. Honest before hype.</h2></div><p>Public pages should make it clear what is available, what is being tested, and what still needs validation.</p></div><div class="truth-grid philosophy-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Clear release states</h3><p>Beta, early access, development, and orderable work are labeled instead of blended together.</p></article><article class="truth-item"><h3>Privacy-conscious defaults</h3><p>Local-first workflows and explicit exports are preferred wherever the product allows it.</p></article><article class="truth-item"><h3>Measured claims</h3><p>Sensor, camera, field, and estimate tools state limitations instead of overselling accuracy.</p></article></div></div></section>
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Current focus</p><h2>Release queue</h2></div><p>Current work stays narrow while direct orders and tester requests help prioritize what gets finished next.</p></div><div class="road-list">${roadmap.slice(0, 4).map((item, index) => `<div class="road-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div></section>
  <section class="band"><div class="shell section compact"><div class="founder-panel"><div><p class="eyebrow">The builder</p><h2>Built by Max Uland under Maxxed Technical Systems.</h2><p>Keeping Max visible supports the product brand while leaving room for custom software, contracting, and practical build work outside the catalog.</p></div><div class="hero-actions"><a class="button" href="about/">About the company</a><a class="button secondary" href="custom-orders/">Order custom work</a></div></div></div></section>
  <section class="shell contact-band"><div><h2>Need a tool, tester build, or custom workflow?</h2><p>Pick the clearest path: apps, plugins, tools, beta testing, or direct ordering.</p></div><a class="button" href="custom-orders/">Start an Order</a></section>`;
}

function customOrdersBody() {
  const orderTypes = ["Android App", "WordPress Plugin", "Web Tool", "Automation", "Dashboard", "Landing Page", "MVP Prototype", "Project Cleanup"];
  const process = [
    ["Submit request", "Describe the workflow, platform, audience, deadline pressure, and current pain point."],
    ["Scope review", "Maxxed reviews feasibility, risk, missing details, and the fastest useful build path."],
    ["Quote or recommendation", "You receive a quote, next-step recommendation, or a better-fit product route."],
    ["Build begins", "Approved work moves into a focused build pass with direct communication."],
    ["Test or launch package", "The deliverable is handed off as a usable version, test build, plugin package, or launch-ready page/tool."],
  ];
  const subject = encodeURIComponent("Custom software order request");
  const body = encodeURIComponent("Project type:\nPlatform needed:\nWhat needs to be built:\nWho will use it:\nCurrent workflow/problem:\nMust-have features:\nNice-to-have features:\nDeadline or urgency:\nBudget range if known:\nLinks or examples:\n");
  return `<section class="band product-hero presence-hero"><div class="shell product-hero-grid"><div><p class="eyebrow">Direct ordering</p><h1>Order a custom app, plugin, automation, or workflow tool.</h1><p class="lede">Submit a focused build request for Android apps, WordPress plugins, web tools, dashboards, automations, landing pages, MVPs, or existing project cleanup.</p><div class="hero-actions"><a class="button" href="mailto:${site.email}?subject=${subject}&body=${body}">Start order email</a><a class="button secondary" href="../pricing/">View pricing</a><a class="button secondary" href="../support/?app=Custom%20software&issue=Feature%20request">Ask before ordering</a></div></div><div class="product-visual custom-order-visual" style="--accent:var(--lime)"><span class="product-visual-label">Reviewed directly</span><strong>Custom work is reviewed by Max Uland for scope, feasibility, and next build path.</strong><div class="fact-row"><span>Apps</span><span>Plugins</span><span>Automation</span><span>MVPs</span></div></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">What you can order</p><h2>Focused builds, not vague software promises</h2></div><p>Good requests are specific enough to quote, prototype, or route into an existing product lane.</p></div><div class="order-type-grid">${orderTypes.map((type) => `<article class="order-type-card"><span class="status">Order type</span><h3>${type}</h3><p>Request a focused ${type.toLowerCase()} build, cleanup, or MVP-style implementation path.</p></article>`).join("")}</div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Process</p><h2>How ordering works</h2></div><p>The goal is to quickly identify what should be built, what should not be promised, and what version is useful first.</p></div><ol class="process-list">${process.map(([title, text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join("")}</ol></div></section>
  <section class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">Good fit</p><h2>Best projects for this path</h2></aside><article><p>Small business tools, admin dashboards, intake forms, product pages, app prototypes, WordPress workflows, automations, calculators, internal utilities, and existing-project cleanup are all good fits.</p><p>Large enterprise systems, regulated/high-risk software, unclear “next Uber” ideas, and projects without a defined first version need heavier planning before build work.</p><p><a class="button" href="mailto:${site.email}?subject=${subject}&body=${body}">Start a custom order</a></p></article></div></section>`;
}

function toolsBody() {
  const featured = allTools.slice(0, 24);
  return `<section class="band"><div class="shell section compact"><p class="eyebrow">Focused tools</p><h1>Software tools and product concepts</h1><p class="lede">Browse focused web tools and business utilities available for discussion, testing, custom ordering, or future build prioritization.</p><div class="proof-row"><span>${allTools.length} tool concepts</span><span>Requestable builds</span><span>Workflow utilities</span><span>Custom order path</span></div><div class="hero-actions"><a class="button" href="../custom-orders/">Request a tool build</a><a class="button secondary" href="../apps/">Browse apps</a><a class="button secondary" href="../plugins/">Browse plugins</a></div></div></section>
  <section class="shell section compact"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search tools</span><input type="search" data-app-search placeholder="Search tools by name or workflow" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter tools"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="business" aria-pressed="false">Business</button><button class="filter" data-filter="finance" aria-pressed="false">Finance</button><button class="filter" data-filter="content" aria-pressed="false">Content</button><button class="filter" data-filter="civic" aria-pressed="false">Civic</button><button class="filter" data-filter="repo" aria-pressed="false">Web</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><p class="empty-state" data-empty-state hidden>No tools match that search. Try a broader workflow term.</p></section>
  <section class="shell section catalog-section" data-catalog><div class="section-head"><div><p class="eyebrow">Tool catalog</p><h2>Start with the most requestable ideas</h2></div><p>Each card opens an individual page. The clearest next step is discussion, support, or direct ordering.</p></div><div class="app-grid dense-grid">${featured.map((product) => toolCard(product, 1)).join("")}</div></section>
  <section class="band"><div class="shell section compact"><div class="order-panel"><div><p class="eyebrow">Need one built?</p><h2>Turn a concept into a scoped order.</h2><p>Send the exact workflow, platform, users, current tool, and must-have first version.</p></div><div class="hero-actions"><a class="button" href="../custom-orders/">Start an order</a><a class="button secondary" href="../support/?app=Focused%20tool&issue=Feature%20request">Ask which tool fits</a></div></div></div></section>`;
}

function pageHtml({ title, description, path, depth, current, body, schema = [] }) {
  const pageUrl = canonical(path);
  const schemas = [
    { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, email: site.email, logo: canonical("assets/images/favicon.svg") },
    ...schema,
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${escapeHtml(site.name)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta property="og:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${canonical("assets/images/og-default.png")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${canonical("assets/images/og-default.png")}">
  <meta name="theme-color" content="#07131f">
  <link rel="icon" href="${link(depth, "assets/images/favicon.svg")}" type="image/svg+xml">
  <link rel="manifest" href="${link(depth, "site.webmanifest")}">
  <link rel="stylesheet" href="${link(depth, "assets/site.css")}">
  ${schemas.map((item) => `<script type="application/ld+json">${jsonLd(item)}</script>`).join("\n  ")}
</head>
<body data-support-email="${site.email}" data-beta-email="${site.betaEmail}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(depth, current)}
  <main id="main">${body}</main>
  ${footer(depth)}
  <script src="${link(depth, "assets/site.js")}" defer></script>
</body>
</html>`;
}

function replaceMain(html, body) {
  return html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${body}</main>`);
}

function patchShell(html, filePath) {
  const depth = depthForFile(filePath);
  const current = currentForFile(filePath);
  return html
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, header(depth, current))
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer(depth));
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

async function writeSitePage(path, html) {
  const target = resolve(siteRoot, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

function addSitemapUrl(sitemap, path) {
  const url = `${site.url}/${path}`;
  if (sitemap.includes(`<loc>${url}</loc>`)) return sitemap;
  return sitemap.replace("</urlset>", `  <url><loc>${url}</loc></url>\n</urlset>`);
}

const homePath = resolve(siteRoot, "index.html");
let home = await readFile(homePath, "utf8");
home = replaceMain(home, homeBody())
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Practical apps, plugins, custom software tools, beta testing, and direct ordering from Maxxed Technical Systems.">')
  .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="Practical apps, plugins, custom software tools, beta testing, and direct ordering from Maxxed Technical Systems.">')
  .replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="Practical apps, plugins, custom software tools, beta testing, and direct ordering from Maxxed Technical Systems.">');
await writeFile(homePath, patchShell(home, homePath), "utf8");

await writeSitePage("custom-orders/index.html", pageHtml({
  title: "Custom Orders",
  description: "Order a custom app, WordPress plugin, automation, dashboard, web tool, MVP prototype, or project cleanup from Maxxed Technical Systems.",
  path: "custom-orders/",
  depth: 1,
  current: "custom-orders",
  body: customOrdersBody(),
  schema: [{ "@context": "https://schema.org", "@type": "Service", name: "Custom software orders", provider: { "@type": "Organization", name: site.name, url: site.url }, areaServed: "United States", serviceType: "Custom app, plugin, automation, and workflow software builds" }],
}));

await writeSitePage("tools/index.html", pageHtml({
  title: "Tools",
  description: "Browse Maxxed focused software tools and product concepts available for discussion, testing, custom ordering, or future build prioritization.",
  path: "tools/",
  depth: 1,
  current: "tools",
  body: toolsBody(),
  schema: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Maxxed software tools", url: canonical("tools/"), mainEntity: { "@type": "ItemList", numberOfItems: allTools.length, itemListElement: allTools.slice(0, 50).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: canonical(`tools/${item.slug}/`) })) } }],
}));

for (const file of await htmlFiles(siteRoot)) {
  const html = await readFile(file, "utf8");
  await writeFile(file, patchShell(html, file), "utf8");
}

let css = await readFile(cssPath, "utf8");
if (!css.includes("/* Homepage presence redesign */")) {
  css += `

/* Homepage presence redesign */
.presence-hero {
  background:
    radial-gradient(circle at 80% 20%, rgba(37, 208, 216, 0.22), transparent 34%),
    radial-gradient(circle at 10% 0%, rgba(185, 237, 69, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.035), transparent 55%);
}
.presence-hero h1 { max-width: 820px; letter-spacing: -0.055em; }
.founder-badge,
.founder-line { color: #d8e5e9; font-size: 13px; font-weight: 750; }
.founder-badge { margin-top: 22px; }
.founder-line { margin-top: 18px; margin-bottom: 0; }
.presence-console {
  padding: clamp(20px, 3vw, 32px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(13, 28, 40, 0.95), rgba(7, 19, 31, 0.9));
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.36);
}
.console-top { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 18px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; }
.console-top strong { color: var(--lime); }
.product-stack { display: grid; gap: 12px; }
.product-stack-card {
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  background: rgba(255, 255, 255, 0.035);
  color: var(--ink);
  text-decoration: none;
}
.product-stack-card:hover { border-color: var(--accent); transform: translateX(4px); }
.product-stack-card strong,
.product-stack-card small { display: block; }
.product-stack-card small { color: var(--muted); font-size: 12px; }
.path-grid,
.order-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.path-card,
.order-type-card {
  min-height: 260px;
  padding: clamp(22px, 3vw, 30px);
  border: 1px solid var(--line);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
}
.path-card:nth-child(4) { border-color: rgba(185, 237, 69, 0.52); background: linear-gradient(180deg, rgba(185, 237, 69, 0.1), var(--surface)); }
.path-card h2 { margin: 24px 0 12px; font-size: clamp(27px, 3.2vw, 38px); }
.path-card p,
.order-type-card p { color: var(--muted); }
.path-card strong { margin-top: auto; color: var(--lime); }
.presence-card { border-radius: 16px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04); }
.order-band { background: linear-gradient(135deg, rgba(185, 237, 69, 0.13), rgba(37, 208, 216, 0.08)); }
.order-panel,
.founder-panel {
  padding: clamp(28px, 5vw, 48px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: clamp(24px, 5vw, 54px);
  align-items: center;
  background: rgba(13, 28, 40, 0.86);
}
.order-panel p,
.founder-panel p { max-width: 720px; color: var(--muted); }
.philosophy-grid .truth-item,
.order-type-card { border-radius: 14px; }
.process-list { margin: 0; padding: 0; list-style: none; counter-reset: process; display: grid; gap: 12px; }
.process-list li {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 14px;
  display: grid;
  grid-template-columns: 58px 0.8fr 1.2fr;
  gap: 18px;
  align-items: start;
  background: var(--surface);
  counter-increment: process;
}
.process-list li::before { content: counter(process, decimal-leading-zero); color: var(--lime); font-weight: 900; }
.process-list span { color: var(--muted); }
.custom-order-visual { border-radius: 18px; }
@media (max-width: 1080px) {
  .path-grid,
  .order-type-grid { grid-template-columns: repeat(2, 1fr); }
  .order-panel,
  .founder-panel { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .path-grid,
  .order-type-grid { grid-template-columns: 1fr; }
  .path-card,
  .order-type-card { min-height: auto; }
  .process-list li { grid-template-columns: 1fr; }
  .console-top { align-items: flex-start; flex-direction: column; }
}
`;
  await writeFile(cssPath, css, "utf8");
}

const sitemapPath = resolve(siteRoot, "sitemap.xml");
try {
  let sitemap = await readFile(sitemapPath, "utf8");
  sitemap = addSitemapUrl(addSitemapUrl(sitemap, "custom-orders/"), "tools/");
  await writeFile(sitemapPath, sitemap, "utf8");
} catch {
  // Sitemap is generated by the main build; skip if a future build changes that output.
}
