import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, roadmap, site, wordpressPlugins } from "../content/site-data.mjs";
import { betaApps, betaCredits } from "../content/beta-data.mjs";
import { privacyPolicies } from "../content/privacy-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "site");
const dist = resolve(root, "dist");
const generatedWorker = resolve(root, "worker/index.js");
const allProducts = [...apps, ...wordpressPlugins, ...repoProducts, ...powerhouseProducts];

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const link = (depth, path = "") => `${"../".repeat(depth)}${path}`;
const rootLink = (_depth, path = "") => `/${path}`;
const canonical = (path = "") => `${site.url}/${path}`;
const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const cardCategory = (item, fallback) => escapeHtml(item.categoryKey || fallback);

function appCard(app, depth, featured = false) {
  return `<a class="app-card${featured ? " featured" : ""}" data-app-card data-category="${cardCategory(app, "utility")}" style="--accent:${escapeHtml(app.accent)}" href="${link(depth, `apps/${app.slug}/`)}"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><h3>${escapeHtml(app.name)}</h3><p>${escapeHtml(app.summary)}</p><span class="app-meta">View details -&gt;</span></a>`;
}

function staticProductCard(item, type = "Repo-backed product") {
  return `<article class="app-card" data-app-card data-category="${cardCategory(item, "repo utility")}" style="--accent:${escapeHtml(item.accent)}"><div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(item.icon)}</span><span class="status">${escapeHtml(item.status)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><div class="fact-row">${(item.facts || []).map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><span class="app-meta">${escapeHtml(type)}</span></article>`;
}

function header(depth, current, makeLink = link) {
  const nav = [["apps", "Apps", "apps/"], ["plugins", "Plugins", "plugins/"], ["beta", "Beta", "beta/"], ["roadmap", "Roadmap", "roadmap/"], ["admin", "Admin", "admin/"], ["support", "Help", "support/"]];
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="${makeLink(depth)}" aria-label="${escapeHtml(site.name)} home"><span class="brand-mark" aria-hidden="true">MTS</span><span>${escapeHtml(site.shortName)}</span></a><nav aria-label="Primary">${nav.map(([key, label, path]) => `<a ${current === key ? "aria-current=\"page\"" : ""} href="${makeLink(depth, path)}">${label}</a>`).join("")}</nav></header>`;
}

function footer(depth, makeLink = link) {
  return `<footer class="site-footer"><p>${escapeHtml(site.name)}. Practical software for Android, WordPress, and repo-backed tools.</p><nav aria-label="Footer"><a href="${makeLink(depth, "apps/")}">Apps</a><a href="${makeLink(depth, "plugins/")}">Plugins</a><a href="${makeLink(depth, "admin/")}">Admin</a><a href="${makeLink(depth, "privacy/")}">Privacy</a><a href="${makeLink(depth, "terms/")}">Terms</a><a href="${makeLink(depth, "accessibility/")}">Accessibility</a></nav></footer>`;
}

function layout({ title, description, path = "", depth = 0, current = "", body, schema = [], noIndex = false, forceRootLinks = false }) {
  const pageLink = forceRootLinks ? rootLink : link;
  const fullTitle = title === site.name ? `${site.name} | Android Apps and Practical Software` : `${title} | ${site.name}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fullTitle)}</title><meta name="description" content="${escapeHtml(description)}">${noIndex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}<link rel="canonical" href="${canonical(path)}"><meta property="og:title" content="${escapeHtml(fullTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical(path)}"><link rel="icon" href="${pageLink(depth, "assets/images/favicon.svg")}" type="image/svg+xml"><link rel="manifest" href="${pageLink(depth, "site.webmanifest")}"><link rel="stylesheet" href="${pageLink(depth, "assets/site.css")}">${schema.map((item) => `<script type="application/ld+json">${jsonLd(item)}</script>`).join("")}</head><body>${header(depth, current, pageLink)}<main id="main">${body}</main>${footer(depth, pageLink)}<script src="${pageLink(depth, "assets/site.js")}" defer></script></body></html>`;
}

const contactBand = (depth, heading = "Need help choosing the right product?") => `<section class="shell contact-band"><div><h2>${escapeHtml(heading)}</h2><p>Talk directly with Maxxed Technical Systems.</p></div><a class="button" href="${link(depth, "support/")}">Visit support</a></section>`;

function catalogFilters() {
  const filters = [["all", "All"], ["utility", "Utilities"], ["outdoors", "Outdoors"], ["games", "Games"], ["wordpress", "WordPress"], ["repo", "Standalone repos"], ["powerhouse", "Powerhouse repos"], ["business", "Business"], ["civic", "Civic"], ["content", "Content"], ["finance", "Finance"]];
  return `<div class="catalog-tools"><label class="search-box"><span class="skip-link">Search products</span><input type="search" data-app-search placeholder="Search by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter products">${filters.map(([key, label], index) => `<button class="filter" data-filter="${key}" aria-pressed="${index === 0 ? "true" : "false"}">${label}</button>`).join("")}</div></div><p class="fine-print" data-result-count aria-live="polite"></p>`;
}

function homePage() {
  const pluginHighlights = wordpressPlugins.slice(0, 6);
  const repoHighlights = [...repoProducts.slice(0, 3), ...powerhouseProducts.slice(0, 3)];
  const body = `<section class="hero"><p class="eyebrow">Android apps + WordPress plugins + repo products</p><h1>Maxxed Technical Systems</h1><p>${escapeHtml(site.description)}</p><div class="hero-actions"><a class="button" href="apps/">Explore all products</a><a class="button secondary" href="plugins/">WordPress plugins</a></div><div class="proof-row"><span>${allProducts.length} public products</span><span>${apps.length} Android apps</span><span>${wordpressPlugins.length} WordPress plugins</span><span>${repoProducts.length + powerhouseProducts.length} repo products</span></div></section><section class="shell section"><div class="section-head"><div><p class="eyebrow">Android apps</p><h2>Built around real tasks</h2></div><p>Six focused app products stay prominent while the full repo-backed catalog remains searchable.</p></div><div class="app-grid">${apps.map((app, index) => appCard(app, 0, index < 2)).join("")}</div></section><section class="band" data-plugin-summary><div class="shell section"><div class="section-head"><div><p class="eyebrow">WordPress plugin lab</p><h2>${wordpressPlugins.length} plugins prepared for testing</h2></div><p>Every checked WordPress plugin package is listed separately for lab review.</p></div><div class="app-grid">${pluginHighlights.map((plugin) => staticProductCard(plugin, "WordPress plugin package")).join("")}</div><div class="hero-actions"><a class="button secondary" href="plugins/">View all ${wordpressPlugins.length} WordPress plugins</a></div></div></section><section class="shell section"><div class="section-head"><div><p class="eyebrow">Repo-backed product library</p><h2>${repoProducts.length + powerhouseProducts.length} additional repo products</h2></div><p>Standalone repos and materialized powerhouse repos are included without flooding the homepage.</p></div><div class="app-grid">${repoHighlights.map((product) => staticProductCard(product)).join("")}</div><div class="hero-actions"><a class="button secondary" href="apps/">Browse all ${allProducts.length} products</a></div></section>${contactBand(0)}`;
  return layout({ title: site.name, description: site.description, body, schema: [{ "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url }] });
}

function appsPage() {
  const cards = `${apps.map((app) => appCard(app, 1)).join("")}${wordpressPlugins.map((plugin) => staticProductCard(plugin, "WordPress plugin package")).join("")}${repoProducts.map((product) => staticProductCard(product)).join("")}${powerhouseProducts.map((product) => staticProductCard(product)).join("")}`;
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product directory</p><h1>Android apps, WordPress plugins, and software</h1><p class="lede">Browse ${allProducts.length} public products, including six Android apps, 36 WordPress plugins, 44 standalone repo products, and 100 powerhouse repo products.</p></div></section><section class="shell section">${catalogFilters()}<div class="app-grid" data-catalog>${cards}</div><p class="empty-state" data-empty-state hidden>No products match that search. Try a product name or broader category.</p></section>${contactBand(1)}`;
  return layout({ title: "Apps", description: "Browse Maxxed Technical Systems Android apps, WordPress plugins, standalone repo products, and powerhouse repo products in one organized catalog.", path: "apps/", depth: 1, current: "apps", body });
}

function pluginsPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">WordPress plugin lab</p><h1>WordPress plugins</h1><p class="lede">Browse every checked Maxxed WordPress plugin package prepared for lab testing, editable profiles, and organized plugin-site review.</p><div class="proof-row"><span>${wordpressPlugins.length} plugin packages</span><span>Editable test profiles</span><span>Installed artifact ready</span><span>Public catalog cards</span></div></div></section><section class="shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search plugins</span><input type="search" data-app-search placeholder="Search plugins by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter plugins"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><div class="app-grid" data-catalog>${wordpressPlugins.map((plugin) => staticProductCard(plugin, "WordPress plugin package")).join("")}</div><p class="empty-state" data-empty-state hidden>No plugins match that search.</p></section>${contactBand(1, "Need help with a WordPress plugin?")}`;
  return layout({ title: "WordPress Plugins", description: "Browse Maxxed Technical Systems WordPress plugin packages for audits, cleanup, maintenance, commerce, schema, content, and operations.", path: "plugins/", depth: 1, current: "plugins", body });
}

function productPage(app) {
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${escapeHtml(app.accent)}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><p class="eyebrow">${escapeHtml(app.category)} app</p><h1>${escapeHtml(app.name)}</h1><p class="lede">${escapeHtml(app.description)}</p><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../beta/?app=${app.slug}">Join the beta list</a><a class="button secondary" href="privacy/">App privacy</a></div></div><div class="product-visual" style="--accent:${escapeHtml(app.accent)}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><strong>${escapeHtml(app.tagline)}</strong></div></div></section><section class="shell section"><div class="section-head"><div><p class="eyebrow">Capabilities</p><h2>What ${escapeHtml(app.short)} does</h2></div><p>${escapeHtml(app.summary)}</p></div><div class="feature-list" style="--accent:${escapeHtml(app.accent)}">${app.features.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section><section class="shell section"><div class="truth-grid" style="--accent:${escapeHtml(app.accent)}"><article class="truth-item"><h3>Availability</h3><p>${escapeHtml(app.availability)}</p></article><article class="truth-item"><h3>Privacy</h3><p>${escapeHtml(app.privacy)} <a href="privacy/">Read the detailed privacy policy.</a></p></article><article class="truth-item"><h3>Important limitation</h3><p>${escapeHtml(app.limitation)}</p></article></div></section>${contactBand(2, `Need help with ${app.name}?`)}`;
  return layout({ title: app.name, description: app.summary, path: `apps/${app.slug}/`, depth: 2, current: "apps", body, schema: [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: app.name, operatingSystem: "Android", description: app.summary }] });
}

function appPrivacyPage(app) {
  const policy = privacyPolicies[app.slug];
  if (!policy) throw new Error(`Missing privacy policy for ${app.slug}`);
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Effective ${escapeHtml(policy.effectiveDate)}</p><h1>${escapeHtml(app.name)} Privacy Policy</h1><p class="lede">${escapeHtml(policy.overview)}</p></div></section><section class="shell section"><article class="legal-copy"><h2>Data processed</h2><ul>${policy.dataProcessed.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h2>Permissions and purpose</h2><ul>${policy.permissions.map(([name, purpose]) => `<li><strong>${escapeHtml(name)}:</strong> ${escapeHtml(purpose)}</li>`).join("")}</ul><h2>Storage and security</h2><p>${escapeHtml(policy.storage)}</p><h2>Collection and sharing</h2><p>${escapeHtml(policy.sharing)}</p><h2>Retention</h2><p>${escapeHtml(policy.retention)}</p><h2>Deletion</h2><p>${escapeHtml(policy.deletion)}</p><h2>Third-party services</h2><p>${escapeHtml(policy.thirdParties)}</p><h2>Children</h2><p>${escapeHtml(policy.children)}</p><h2>Contact</h2><p>Questions may be sent to <a href="mailto:${site.privacyEmail}">${site.privacyEmail}</a>.</p></article></section>`;
  return layout({ title: `${app.name} Privacy Policy`, description: `Read the detailed ${app.name} privacy policy, including permissions, local storage, sharing, retention, deletion, and third-party services.`, path: `apps/${app.slug}/privacy/`, depth: 3, current: "apps", body });
}

function simplePage(title, path, current, description, body) {
  return layout({ title, path, current, description, depth: path.split("/").filter(Boolean).length, body });
}

function betaPage() {
  const choices = betaApps.map(([slug, name, note]) => `<label><input type="checkbox" name="apps" value="${escapeHtml(name)}" data-app-slug="${escapeHtml(slug)}"> <strong>${escapeHtml(name)}</strong> - ${escapeHtml(note)}</label>`).join("");
  return simplePage("Become a Beta Tester", "beta/", "beta", "Apply to beta test Maxxed Android apps, select the products you want to test, and optionally receive public beta tester credit.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Android first</p><h1>Become a beta tester</h1><p class="lede">Testing is voluntary and unpaid. Public credit is optional and requires explicit permission.</p></div></section><section class="shell section"><form class="form-grid"><label>Email <input type="email" name="email" required></label><fieldset><legend>Apps</legend>${choices}</fieldset><label><input type="checkbox" name="creditConsent"> I approve optional public tester credit.</label></form><p>Email <a href="mailto:${site.betaEmail}">${site.betaEmail}</a> for beta access.</p></section>`);
}

function betaCreditsPage() {
  return simplePage("Beta Tester Credits", "beta-credits/", "beta", "Recognizing approved Maxxed Android beta testers who helped improve early product builds.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Credits</p><h1>Beta tester credits</h1><p class="lede">Public credit is recognition, not compensation, and appears only after explicit approval.</p></div></section><section class="shell section">${betaCredits.map((group) => `<article><h2>${escapeHtml(group.group)}</h2><p>${group.names.length ? group.names.map(escapeHtml).join(", ") : "No public names approved yet."}</p></article>`).join("")}</section>`);
}

function postPurgePage() {
  return layout({ title: "Post Purge Pro", description: "Post Purge Pro is a WordPress plugin candidate for previewing stale posts, exporting CSV backups, and trash-only cleanup.", path: "tools/post-purge-pro/", depth: 2, current: "plugins", body: `<section class="band"><div class="shell section compact"><p class="eyebrow">WordPress plugin</p><h1>Post Purge Pro</h1><p class="lede">Preview -&gt; Export -&gt; Confirm -&gt; Trash. The plugin is built for review-first stale content cleanup.</p></div></section><section class="shell section"><h2>Safety workflow</h2><p>Post Purge Pro keeps cleanup Trash-only, requires preview and confirmation, and supports CSV backup before batch action.</p><h2>Lab validation</h2><p>The plugin can be exercised through docker compose in the local WordPress harness.</p></section>` });
}

function adminPage() {
  return layout({ title: "Admin Routing", description: "Admin routing hub for Maxxed Technical Systems product catalog, plugin sub-site, beta, support, roadmap, and policy travel.", path: "admin/", depth: 1, current: "admin", noIndex: true, body: `<section class="band"><div class="shell section compact"><p class="eyebrow">Admin travel</p><h1>Maxxed admin routing</h1><p class="lede">A direct control hub for product catalog, plugin sub-site checks, beta flow, support, and release planning.</p></div></section><section class="shell section"><div class="app-grid"><a class="app-card" href="plugins/"><h2>Plugin sub-site</h2><p>Review WordPress plugin lab routing.</p></a><a class="app-card" href="../apps/"><h2>Public catalog</h2><p>Open all ${allProducts.length} listed products.</p></a><a class="app-card" href="../plugins/"><h2>Public plugins</h2><p>Open all ${wordpressPlugins.length} plugin cards.</p></a></div></section>` });
}

function adminPluginsPage() {
  return layout({ title: "WordPress Plugin Admin", description: "Admin view of checked WordPress plugins installed into the plugin sub-site artifact with editable profile settings pages.", path: "admin/plugins/", depth: 2, current: "admin", noIndex: true, body: `<section class="band"><div class="shell section compact"><p class="eyebrow">Plugin sub-site</p><h1>WordPress plugin admin</h1><p class="lede">Every local WordPress plugin repo has been checked, packaged, installed, and given an editable profile page.</p></div></section><section class="shell section"><div class="app-grid">${wordpressPlugins.map((plugin) => staticProductCard(plugin, "Installed plugin package")).join("")}</div></section>` });
}

function roadmapPage() {
  return simplePage("Roadmap", "roadmap/", "roadmap", "Follow the Tech Maxxed release queue for active Android apps, WordPress plugins, and repo-backed product catalog work.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Roadmap</p><h1>Product release queue</h1><p class="lede">Statuses describe current work, not availability promises.</p></div></section><section class="shell section"><div class="road-list">${roadmap.map((item, index) => `<div class="road-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div></section>`);
}

function notFoundPage() {
  return layout({ title: "Page not found", description: "The requested Maxxed Technical Systems page could not be found. Use the product catalog or support route to continue.", noIndex: true, forceRootLinks: true, body: `<section class="shell not-found"><div><strong>404</strong><h1>Page not found</h1><p class="lede">The address may have changed, or the product page may not exist yet.</p><div class="hero-actions"><a class="button" href="/">Return home</a><a class="button secondary" href="/apps/">Browse products</a></div></div></section>` });
}

async function writeHtml(route, html) {
  const file = route ? resolve(output, route, "index.html") : resolve(output, "index.html");
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, html, "utf8");
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
await rm(dist, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });

await writeHtml("", homePage());
await writeHtml("apps", appsPage());
await writeHtml("plugins", pluginsPage());
for (const app of apps) {
  await writeHtml(`apps/${app.slug}`, productPage(app));
  await writeHtml(`apps/${app.slug}/privacy`, appPrivacyPage(app));
}
await writeHtml("roadmap", roadmapPage());
await writeHtml("admin", adminPage());
await writeHtml("admin/plugins", adminPluginsPage());
await writeHtml("tools/post-purge-pro", postPurgePage());
await writeHtml("beta", betaPage());
await writeHtml("beta-credits", betaCreditsPage());
await writeHtml("about", simplePage("About", "about/", "about", "Learn how Maxxed Technical Systems builds practical Android apps, WordPress plugins, and repo-backed software products.", `<section class="band"><div class="shell section compact"><p class="eyebrow">About</p><h1>About Maxxed Technical Systems</h1><p class="lede">A practical product studio building focused Android apps, WordPress tools, and repo-backed software products.</p></div></section>${contactBand(1)}`));
await writeHtml("support", simplePage("Help & Support", "support/", "support", "Get help and support for Maxxed Technical Systems apps, plugins, beta access, and product questions.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Support</p><h1>Help &amp; Support</h1><p class="lede">Email <a href="mailto:${site.email}">${site.email}</a> for product support, plugin lab questions, and beta access.</p></div></section>`));
await writeHtml("privacy", simplePage("Privacy", "privacy/", "privacy", "Read the Maxxed Technical Systems website privacy overview and app-specific privacy policy routing.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Privacy</p><h1>Website privacy</h1><p class="lede">TechMaxxed.com provides product information without website accounts or advertising trackers.</p></div></section><section class="shell section"><p>Email <a href="mailto:${site.privacyEmail}">${site.privacyEmail}</a> for privacy requests.</p></section>`));
await writeHtml("terms", simplePage("Terms of Use", "terms/", "terms", "Read the TechMaxxed.com website, beta participation, tester credit, acceptable use, and product-information terms.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Website terms</p><h1>Terms of Use</h1><p class="lede">These terms govern public product information, support links, beta applications, and tester credits.</p></div></section><section class="shell section"><h2>Beta participation</h2><p>Beta testing is voluntary and unpaid. Test builds may be incomplete, unstable, or removed without notice.</p></section>`));
await writeHtml("accessibility", simplePage("Accessibility", "accessibility/", "support", "Review the accessibility approach and feedback process for the Maxxed Technical Systems website.", `<section class="band"><div class="shell section compact"><p class="eyebrow">Website access</p><h1>Accessibility</h1><p class="lede">Maxxed Technical Systems aims to make this product catalog understandable and usable.</p></div></section>`));
await writeFile(resolve(output, "404.html"), notFoundPage(), "utf8");

const indexedPaths = ["", "apps/", "plugins/", ...apps.flatMap((app) => [`apps/${app.slug}/`, `apps/${app.slug}/privacy/`]), "roadmap/", "about/", "support/", "privacy/", "accessibility/", "beta/", "beta-credits/", "terms/", "tools/post-purge-pro/"];
await writeFile(resolve(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedPaths.map((path) => `  <url><loc>${canonical(path)}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(resolve(output, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${canonical("sitemap.xml")}\n`);
await writeFile(resolve(output, "site.webmanifest"), `${JSON.stringify({ name: site.name, short_name: site.shortName, start_url: "/", display: "standalone", background_color: "#07131f", theme_color: "#07131f", icons: [{ src: "/assets/images/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2)}\n`);
await writeFile(resolve(output, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n");

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const assets = {};
for (const file of await filesUnder(output)) assets[`/${relative(output, file).split(sep).join("/")}`] = { type: mime[extname(file)] || "application/octet-stream", data: (await readFile(file)).toString("base64") };
const workerSource = `const assets=${JSON.stringify(assets)};\nconst decode=(value)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));\nconst security={"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"};\nexport default {async fetch(request){const url=new URL(request.url);let path=decodeURIComponent(url.pathname);if(path==="/")path="/index.html";else if(path.endsWith("/"))path+="index.html";else if(!path.split("/").at(-1).includes(".")&&assets[path+"/index.html"]){return Response.redirect(url.origin+path+"/"+url.search,308);}const asset=assets[path];if(!asset){const missing=assets["/404.html"];return new Response(decode(missing.data),{status:404,headers:{"content-type":missing.type,...security}});}return new Response(decode(asset.data),{headers:{"content-type":asset.type,...security}});}};\n`;
await mkdir(resolve(root, "worker"), { recursive: true });
await writeFile(generatedWorker, workerSource, "utf8");
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await cp(output, resolve(dist, "client"), { recursive: true });
await cp(generatedWorker, resolve(dist, "server/index.js"));
await cp(resolve(root, ".openai/hosting.json"), resolve(dist, ".openai/hosting.json"));
console.log(`Built ${indexedPaths.length} indexed pages plus 404 with ${allProducts.length} products.`);
