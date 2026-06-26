import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { apps, roadmap, site, wordpressPlugins } from "../content/site-data.mjs";
import { betaApps, betaCredits } from "../content/beta-data.mjs";
import { privacyPolicies } from "../content/privacy-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "site");
const dist = resolve(root, "dist");
const generatedWorker = resolve(root, "worker/index.js");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const link = (depth, path = "", forceRoot = false) => forceRoot ? `/${path}` : `${"../".repeat(depth)}${path}`;
const canonical = (path = "") => `${site.url}/${path}`;
const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const categories = [["all", "All"], ["utility", "Utility"], ["outdoors", "Outdoors"], ["games", "Games"], ["wordpress", "WordPress"]];

function appCard(app, depth, featured = false, forceRoot = false) {
  return `<a class="app-card${featured ? " featured" : ""}" data-app-card data-category="${escapeHtml(app.categoryKey || "wordpress")}" style="--accent:${escapeHtml(app.accent)}" href="${link(depth, `apps/${app.slug}/`, forceRoot)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div>
    <h3>${escapeHtml(app.name)}</h3>
    <p>${escapeHtml(app.summary)}</p>
    <span class="app-meta">View details -&gt;</span>
  </a>`;
}

function pluginCard(plugin, depth, forceRoot = false) {
  return `<a class="app-card" data-app-card data-category="wordpress" style="--accent:${escapeHtml(plugin.accent)}" href="${link(depth, `plugins/#${plugin.slug}`, forceRoot)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div>
    <h3>${escapeHtml(plugin.name)}</h3>
    <p>${escapeHtml(plugin.summary)}</p>
    <span class="app-meta">${plugin.facts.map(escapeHtml).join(" / ")}</span>
  </a>`;
}

function header(depth, current, forceRoot = false) {
  const nav = [
    ["apps", "Apps", "apps/"],
    ["plugins", "Plugins", "plugins/"],
    ["beta", "Beta", "beta/"],
    ["roadmap", "Roadmap", "roadmap/"],
    ["admin", "Admin", "admin/"],
    ["support", "Help", "support/"],
  ];
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="${link(depth, "", forceRoot)}" aria-label="${escapeHtml(site.name)} home">
      <span class="brand-mark" aria-hidden="true">M</span><span>${escapeHtml(site.shortName)}</span>
    </a>
    <nav aria-label="Primary">${nav.map(([key, label, path]) => `<a ${current === key ? "aria-current=\"page\"" : ""} href="${link(depth, path, forceRoot)}">${label}</a>`).join("")}</nav>
  </header>`;
}

function footer(depth, forceRoot = false) {
  return `<footer class="site-footer">
    <p>&copy; 2026 ${escapeHtml(site.name)}. Practical software for Android, WordPress, and small business operations.</p>
    <nav aria-label="Footer">
      <a href="${link(depth, "apps/", forceRoot)}">Apps</a>
      <a href="${link(depth, "plugins/", forceRoot)}">Plugins</a>
      <a href="${link(depth, "beta/", forceRoot)}">Beta</a>
      <a href="${link(depth, "admin/", forceRoot)}">Admin</a>
      <a href="${link(depth, "privacy/", forceRoot)}">Privacy</a>
      <a href="${link(depth, "terms/", forceRoot)}">Terms</a>
      <a href="${link(depth, "accessibility/", forceRoot)}">Accessibility</a>
    </nav>
  </footer>`;
}

function layout({ title, description, path = "", depth = 0, current = "", body, forceRoot = false, schema }) {
  const assetPath = link(depth, "assets/", forceRoot);
  const pageTitle = title === site.name ? title : `${title} | ${site.shortName}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonical(path))}">
  <link rel="canonical" href="${escapeHtml(canonical(path))}">
  <link rel="icon" href="${assetPath}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${assetPath}site.css">
  ${schema ? `<script type="application/ld+json">${jsonLd(schema)}</script>` : ""}
</head>
<body>
${header(depth, current, forceRoot)}
<main id="main">${body}</main>
${footer(depth, forceRoot)}
<script src="${assetPath}site.js" defer></script>
</body>
</html>`;
}

const contactBand = (depth) => `<section class="band contact-band">
  <p class="eyebrow">Need support or access?</p>
  <h2>Contact Maxxed Technical Systems</h2>
  <p>For support, beta access, privacy requests, or plugin lab questions, email <a href="mailto:${site.email}">${site.email}</a>.</p>
  <div class="hero-actions"><a class="button" href="${link(depth, "support/")}">Get support</a><a class="button secondary" href="mailto:${site.email}">Email us</a></div>
</section>`;

function homePage() {
  const featuredPlugins = wordpressPlugins.slice(0, 6).map((plugin) => pluginCard(plugin, 0)).join("");
  return layout({
    title: site.name,
    description: site.description,
    current: "home",
    schema: { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, email: site.email },
    body: `<section class="hero">
      <p class="eyebrow">Maxxed app suite</p>
      <h1>Useful Android apps and WordPress tools without hiding the practical details.</h1>
      <p>${escapeHtml(site.description)}</p>
      <div class="hero-actions"><a class="button" href="apps/">View all products</a><a class="button secondary" href="plugins/">WordPress plugins</a></div>
    </section>
    <section class="band">
      <div class="section-heading"><p class="eyebrow">Core apps</p><h2>Six focused Android products</h2><p>These stay prominent on the homepage. The full WordPress inventory lives in organized catalog pages.</p></div>
      <div class="app-grid featured-grid">${apps.map((app) => appCard(app, 0, true)).join("")}</div>
    </section>
    <section class="band" data-plugin-summary>
      <div class="section-heading"><p class="eyebrow">WordPress plugin lab</p><h2>${wordpressPlugins.length} plugin candidates, organized separately.</h2><p>A short preview stays here; the complete plugin list is searchable on the plugin catalog.</p></div>
      <div class="app-grid">${featuredPlugins}</div>
      <p><a class="button secondary" href="plugins/">Open all WordPress plugins</a></p>
    </section>
    ${contactBand(0)}`,
  });
}

function catalogControls() {
  return `<div class="catalog-tools" aria-label="Catalog filters">
    <label class="search-box">Search <input type="search" data-search placeholder="Search by name, feature, or status"></label>
    <div class="filter-row">${categories.map(([key, label]) => `<button class="filter-pill${key === "all" ? " active" : ""}" type="button" data-filter="${key}">${label}</button>`).join("")}</div>
  </div>`;
}

function appsPage() {
  const products = [...apps.map((app) => appCard(app, 1)), ...wordpressPlugins.map((plugin) => pluginCard(plugin, 1))].join("");
  return layout({
    title: "Products",
    description: "Browse Android apps and WordPress plugin candidates from Maxxed Technical Systems in one organized product catalog.",
    path: "apps/",
    depth: 1,
    current: "apps",
    body: `<section class="page-hero"><p class="eyebrow">Product catalog</p><h1>All products, grouped without flooding the homepage.</h1><p>Use filters or search to move between Android apps, outdoors tools, utilities, games, and WordPress plugin candidates.</p></section>
    <section class="band">${catalogControls()}<div class="app-grid catalog-grid">${products}</div></section>`,
  });
}

function pluginsPage() {
  return layout({
    title: "WordPress Plugins",
    description: "Browse WordPress plugin lab candidates with editable settings, packaged ZIP artifacts, and installation-ready plugin folders.",
    path: "plugins/",
    depth: 1,
    current: "plugins",
    body: `<section class="page-hero"><p class="eyebrow">Plugin lab</p><h1>WordPress plugin candidates</h1><p>${wordpressPlugins.length} plugins are tracked here with editable profile/settings surfaces, ZIP packages, and installed artifact folders for lab review.</p></section>
    <section class="band">${catalogControls()}<div class="app-grid catalog-grid">${wordpressPlugins.map((plugin) => `<article class="app-card" id="${plugin.slug}" data-app-card data-category="wordpress" style="--accent:${escapeHtml(plugin.accent)}">
      <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div>
      <h3>${escapeHtml(plugin.name)}</h3><p>${escapeHtml(plugin.summary)}</p><span class="app-meta">${plugin.facts.map(escapeHtml).join(" / ")}</span>
    </article>`).join("")}</div></section>`,
  });
}

function productPage(app) {
  const policy = privacyPolicies[app.slug];
  return layout({
    title: app.name,
    description: app.summary,
    path: `apps/${app.slug}/`,
    depth: 2,
    current: "apps",
    schema: { "@context": "https://schema.org", "@type": "SoftwareApplication", name: app.name, applicationCategory: app.category, operatingSystem: "Android" },
    body: `<section class="page-hero product-hero" style="--accent:${escapeHtml(app.accent)}"><p class="eyebrow">${escapeHtml(app.category)} / ${escapeHtml(app.status)}</p><h1>${escapeHtml(app.name)}</h1><p>${escapeHtml(app.description)}</p><div class="hero-actions"><a class="button" href="privacy/">Privacy policy</a><a class="button secondary" href="${link(2, "beta/")}">Join beta</a></div></section>
    <section class="band"><div class="feature-list">${app.features.map(([title, text]) => `<article><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
    <section class="band split"><article><p class="eyebrow">Privacy posture</p><h2>Designed around local control.</h2><p>${escapeHtml(app.privacy)}</p>${policy ? `<p><a href="privacy/">Read the full ${escapeHtml(app.name)} privacy policy.</a></p>` : ""}</article><article><p class="eyebrow">Limitations</p><h2>Clear limits before release.</h2><p>${escapeHtml(app.limitation)}</p><p>${escapeHtml(app.availability)}</p></article></section>`,
  });
}

function appPrivacyPage(app) {
  const policy = privacyPolicies[app.slug];
  if (!policy) throw new Error(`Missing privacy policy for ${app.slug}`);
  return layout({
    title: `${app.name} Privacy Policy`,
    description: `Privacy policy for ${app.name}, including data processed, permissions, storage, retention, deletion, and third-party services.`,
    path: `apps/${app.slug}/privacy/`,
    depth: 3,
    current: "apps",
    body: `<section class="page-hero"><p class="eyebrow">Effective ${escapeHtml(policy.effectiveDate)}</p><h1>${escapeHtml(app.name)} Privacy Policy</h1><p>${escapeHtml(policy.overview)}</p></section>
    <section class="band legal-copy"><h2>Data processed</h2><ul>${policy.dataProcessed.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h2>Permissions and purpose</h2><ul>${policy.permissions.map(([name, purpose]) => `<li><strong>${escapeHtml(name)}:</strong> ${escapeHtml(purpose)}</li>`).join("")}</ul><h2>Storage</h2><p>${escapeHtml(policy.storage)}</p><h2>Sharing</h2><p>${escapeHtml(policy.sharing)}</p><h2>Retention</h2><p>${escapeHtml(policy.retention)}</p><h2>Deletion</h2><p>${escapeHtml(policy.deletion)}</p><h2>Third-party services</h2><p>${escapeHtml(policy.thirdParties)}</p><h2>Children</h2><p>${escapeHtml(policy.children)}</p><h2>Contact</h2><p>Email <a href="mailto:${site.privacyEmail}">${site.privacyEmail}</a> for privacy requests.</p></section>`,
  });
}

function betaPage() {
  return layout({
    title: "Beta Testers",
    description: "Apply to test Maxxed Technical Systems Android apps and receive public credit only when you explicitly approve it.",
    path: "beta/",
    depth: 1,
    current: "beta",
    body: `<section class="page-hero"><p class="eyebrow">Beta program</p><h1>Help test the apps before release.</h1><p>Testing is voluntary and unpaid. Public credit is optional and only added with explicit permission.</p></section>
    <section class="band"><form class="beta-form" action="https://forms.gle/" method="get"><label>Name <input name="name" required></label><label>Email <input type="email" name="email" required></label><fieldset><legend>Apps to test</legend>${betaApps.map(([slug, name, note]) => `<label><input type="checkbox" name="apps" value="${escapeHtml(slug)}"> ${escapeHtml(name)} - ${escapeHtml(note)}</label>`).join("")}</fieldset><label><input type="checkbox" name="creditConsent" value="yes"> I approve optional public tester credit if accepted.</label><button class="button" type="submit">Send beta interest</button></form><p>Questions can go to <a href="mailto:${site.betaEmail}">${site.betaEmail}</a>.</p></section>`,
  });
}

function betaCreditsPage() {
  return layout({
    title: "Beta Credits",
    description: "Public beta tester credits for Maxxed Technical Systems apps, shown only after explicit tester approval.",
    path: "beta-credits/",
    depth: 1,
    current: "beta",
    body: `<section class="page-hero"><p class="eyebrow">Credits</p><h1>Beta tester credits</h1><p>Public credit is recognition, not compensation, and appears only after explicit approval.</p></section><section class="band">${betaCredits.map((group) => `<article><h2>${escapeHtml(group.group)}</h2><p>${group.names.length ? group.names.map(escapeHtml).join(", ") : "No public names approved yet."}</p></article>`).join("")}</section>`,
  });
}

function roadmapPage() {
  return layout({
    title: "Roadmap",
    description: "Current release preparation, development, and internal testing status for Maxxed Technical Systems products.",
    path: "roadmap/",
    depth: 1,
    current: "roadmap",
    body: `<section class="page-hero"><p class="eyebrow">Roadmap</p><h1>What is moving toward release.</h1><p>High-level product status for Android apps and WordPress plugin candidates.</p></section><section class="band timeline">${roadmap.map(([name, status, text]) => `<article><p class="eyebrow">${escapeHtml(status)}</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(text)}</p></article>`).join("")}</section>`,
  });
}

function adminPage() {
  const routes = [
    ["Products", "apps/", "Full public catalog with apps and plugins"],
    ["WordPress plugins", "admin/plugins/", "Admin-facing plugin inventory route"],
    ["Public plugins", "plugins/", "Public plugin catalog"],
    ["Roadmap", "roadmap/", "Release status"],
    ["Beta", "beta/", "Tester intake"],
    ["Support", "support/", "Support and contact"],
  ];
  return layout({
    title: "Admin Routing",
    description: "A visible routing hub for Maxxed Technical Systems admin navigation and product review shortcuts.",
    path: "admin/",
    depth: 1,
    current: "admin",
    body: `<section class="page-hero"><p class="eyebrow">Admin routing</p><h1>Fast routes for site and plugin review.</h1><p>This public admin hub keeps review paths obvious while the product and plugin catalogs are updated.</p></section><section class="band"><div class="app-grid">${routes.map(([name, path, text]) => `<a class="app-card" href="${link(1, path)}"><h2>${escapeHtml(name)}</h2><p>${escapeHtml(text)}</p><span class="app-meta">Open route -&gt;</span></a>`).join("")}</div></section>`,
  });
}

function adminPluginsPage() {
  return layout({
    title: "Admin Plugin Inventory",
    description: "Admin-facing WordPress plugin inventory with all plugin lab candidates and artifact status notes.",
    path: "admin/plugins/",
    depth: 2,
    current: "admin",
    body: `<section class="page-hero"><p class="eyebrow">Admin plugins</p><h1>WordPress plugin admin inventory</h1><p>${wordpressPlugins.length} plugin candidates are tracked for settings-page review, ZIP packaging, and installed plugin-lab artifacts.</p></section><section class="band"><div class="app-grid">${wordpressPlugins.map((plugin) => pluginCard(plugin, 2)).join("")}</div></section>`,
  });
}

function simplePage(title, path, current, description, body) {
  return layout({ title, path, current, description, depth: path ? path.split("/").filter(Boolean).length : 0, body });
}

function postPurgePage() {
  return layout({
    title: "Post Purge Pro",
    description: "Post Purge Pro is a WordPress plugin candidate for previewing stale posts, exporting CSV backups, and trash-only cleanup.",
    path: "tools/post-purge-pro/",
    depth: 2,
    current: "plugins",
    body: `<section class="page-hero"><p class="eyebrow">WordPress plugin</p><h1>Post Purge Pro</h1><p>Preview -&gt; Export -&gt; Confirm -&gt; Trash. The plugin is built for review-first stale content cleanup.</p></section><section class="band legal-copy"><h2>Safety workflow</h2><p>Post Purge Pro keeps cleanup Trash-only, requires preview and confirmation, and supports CSV backup before any batch action.</p><h2>Lab validation</h2><p>The plugin is packaged for the WordPress plugin lab and can be exercised through docker compose in the local harness.</p></section>`,
  });
}

function notFoundPage() {
  return layout({
    title: "Page Not Found",
    description: "The requested Maxxed Technical Systems page could not be found. Use the product catalog or support route to continue.",
    path: "404.html",
    depth: 0,
    forceRoot: true,
    body: `<section class="page-hero"><p class="eyebrow">404</p><h1>Page not found</h1><p>The route is not available. Use the product catalog, plugin catalog, admin routing hub, or support page to continue.</p><div class="hero-actions"><a class="button" href="/apps/">Products</a><a class="button secondary" href="/plugins/">Plugins</a></div></section>`,
  });
}

async function writePage(path, html) {
  const file = resolve(output, path, "index.html");
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, html);
}

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

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });

await writePage("", homePage());
await writePage("apps", appsPage());
await writePage("plugins", pluginsPage());
for (const app of apps) {
  await writePage(`apps/${app.slug}`, productPage(app));
  await writePage(`apps/${app.slug}/privacy`, appPrivacyPage(app));
}
await writePage("beta", betaPage());
await writePage("beta-credits", betaCreditsPage());
await writePage("roadmap", roadmapPage());
await writePage("admin", adminPage());
await writePage("admin/plugins", adminPluginsPage());
await writePage("tools/post-purge-pro", postPurgePage());
await writePage("about", simplePage("About", "about/", "about", "About Maxxed Technical Systems and the practical software products currently moving through release preparation.", `<section class="page-hero"><p class="eyebrow">About</p><h1>Practical software with explicit limits.</h1><p>Maxxed Technical Systems builds Android utilities, outdoor tools, local games, WordPress plugins, and small business software with clear privacy and release notes.</p></section>${contactBand(1)}`));
await writePage("support", simplePage("Support", "support/", "support", "Get support for Maxxed Technical Systems apps, beta access, privacy requests, and WordPress plugin lab questions.", `<section class="page-hero"><p class="eyebrow">Support</p><h1>Support and contact</h1><p>Email <a href="mailto:${site.email}">${site.email}</a> for product support, beta access, plugin lab questions, and general help.</p></section>`));
await writePage("privacy", simplePage("Privacy", "privacy/", "privacy", "Privacy overview for Maxxed Technical Systems products with links to app-specific privacy policies and contact options.", `<section class="page-hero"><p class="eyebrow">Privacy</p><h1>Privacy overview</h1><p>Each Android app has its own privacy policy. WordPress plugin candidates are reviewed separately as release materials are prepared.</p></section><section class="band"><div class="app-grid">${apps.map((app) => appCard(app, 1)).join("")}</div><p>Email <a href="mailto:${site.privacyEmail}">${site.privacyEmail}</a> for privacy requests.</p></section>`));
await writePage("terms", simplePage("Terms", "terms/", "terms", "Terms for using Maxxed Technical Systems websites, beta materials, Android app information, and plugin lab listings.", `<section class="page-hero"><p class="eyebrow">Terms</p><h1>Terms</h1><p>Product pages and plugin listings are informational until a release package, store page, or license says otherwise.</p></section><section class="band legal-copy"><h2>Beta participation</h2><p>Beta participation is voluntary and unpaid. Do not rely on beta software for safety-critical use.</p><h2>Plugin listings</h2><p>WordPress plugin lab candidates remain subject to testing, documentation, licensing, and release review.</p></section>`));
await writePage("accessibility", simplePage("Accessibility", "accessibility/", "support", "Accessibility statement and contact route for Maxxed Technical Systems website and product information.", `<section class="page-hero"><p class="eyebrow">Accessibility</p><h1>Accessibility</h1><p>We aim to keep the site readable, navigable, and usable. Email <a href="mailto:${site.email}">${site.email}</a> with accessibility issues.</p></section>`));
await writeFile(resolve(output, "404.html"), notFoundPage());

const indexedPaths = ["", "apps/", "plugins/", ...apps.flatMap((app) => [`apps/${app.slug}/`, `apps/${app.slug}/privacy/`]), "beta/", "beta-credits/", "roadmap/", "admin/", "admin/plugins/", "tools/post-purge-pro/", "about/", "support/", "privacy/", "terms/", "accessibility/"];
await writeFile(resolve(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedPaths.map((path) => `  <url><loc>${canonical(path)}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(resolve(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile(resolve(output, "site.webmanifest"), `${JSON.stringify({ name: site.name, short_name: site.shortName, start_url: "/", display: "standalone", background_color: "#08111f", theme_color: "#25d0d8", icons: [{ src: "/assets/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2)}\n`);
await writeFile(resolve(output, "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await writeFile(generatedWorker, `export default { async fetch(request, env) { return env.ASSETS.fetch(request); } };\n`);
await writeFile(resolve(dist, "_routes.json"), `${JSON.stringify({ version: 1, include: ["/*"], exclude: [] }, null, 2)}\n`);
const generatedFiles = (await filesUnder(output)).filter((file) => extname(file) === ".html");
console.log(`Built ${generatedFiles.length} HTML pages with ${apps.length} apps and ${wordpressPlugins.length} WordPress plugins.`);
