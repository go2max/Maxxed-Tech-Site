import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, roadmap, site, wordpressPlugins } from "../content/site-data.mjs";
import { betaApps, betaCredits } from "../content/beta-data.mjs";
import { privacyPolicies } from "../content/privacy-data.mjs";
import adminPlatform from "../platform/src/index.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "site");
const adminOutput = resolve(root, "admin");
const dist = resolve(root, "dist");
const generatedWorker = resolve(root, "worker/index.js");
const googleTagId = "G-FPG9XJHGHK";
const contentSecurityPolicy = "default-src 'self'; img-src 'self' data: https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const link = (depth, path = "") => `${"../".repeat(depth)}${path}`;
const rootLink = (_depth, path = "") => `/${path}`;
const canonical = (path = "") => `${site.url}/${path}`;
const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const allPublicProducts = [...apps, ...wordpressPlugins, ...repoProducts, ...powerhouseProducts];
const publicSiteCss = resolve(root, "public/assets/site.css");
const criticalNavCss = ".site-header{position:sticky;top:0;z-index:30;border-bottom:1px solid rgba(255,255,255,.13);background:#07131f}.nav-shell{width:min(calc(100% - 32px),1180px);min-height:70px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand,.nav-links{display:flex;align-items:center}.brand{gap:11px;color:#f4f7f8;font-weight:850;text-decoration:none}.brand-mark{width:34px;aspect-ratio:1;border-radius:7px;display:grid;place-items:center;background:#b9ed45;color:#07131f;font-size:12px}.nav-links{gap:20px}.nav-links a{color:#a9b7be;font-size:14px;white-space:nowrap;text-decoration:none}.nav-button{min-height:44px;padding:0 18px;border-radius:7px;background:#b9ed45;color:#07131f!important;font-weight:800}@media(max-width:980px){.nav-toggle{display:grid;place-items:center}.nav-links{display:none;position:absolute;left:16px;right:16px;top:76px;padding:14px;border:1px solid rgba(255,255,255,.13);border-radius:8px;background:#0d1c28;flex-direction:column;align-items:stretch}.nav-links[data-open=true]{display:flex}.nav-links a{padding:10px 0}.nav-button{justify-content:center}}";

function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function googleTag() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${googleTagId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', '${googleTagId}');
  </script>`;
}

function appCard(app, depth, featured = false) {
  return `<a class="app-card${featured ? " featured" : ""}" data-app-card data-category="${app.categoryKey}" style="--accent:${app.accent}" href="${link(depth, `apps/${app.slug}/`)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div>
    <h3>${escapeHtml(app.name)}</h3>
    <p>${escapeHtml(app.summary)}</p>
    <span class="app-meta">View ${escapeHtml(app.short)} details →</span>
  </a>`;
}

function pluginCard(plugin, depth = 0) {
  return `<a class="app-card" data-app-card data-category="utility wordpress" style="--accent:${plugin.accent}" href="${link(depth, `plugins/${plugin.slug}/`)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div>
    <h3>${escapeHtml(plugin.name)}</h3>
    <p>${escapeHtml(plugin.summary)}</p>
    <div class="fact-row">${plugin.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div>
    <span class="app-meta">View ${escapeHtml(plugin.name)} details →</span>
  </a>`;
}

function repoProductCard(product, depth = 0) {
  return `<a class="app-card" data-app-card data-category="${escapeHtml(product.categoryKey)}" style="--accent:${escapeHtml(product.accent)}" href="${link(depth, `tools/${product.slug}/`)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(product.icon)}</span><span class="status">${escapeHtml(product.status)}</span></div>
    <h3>${escapeHtml(product.name)}</h3>
    <p>${escapeHtml(product.summary)}</p>
    <div class="fact-row">${product.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div>
    <span class="app-meta">View ${escapeHtml(product.name)} details -></span>
  </a>`;
}

function productCapabilityDetails(product) {
  const text = `${product.slug} ${product.name}`.toLowerCase();
  const details = [];
  if (/seo|metadata|sitemap|web|page|accessibility|link/.test(text)) details.push(["Website review workflow", "Collect page, metadata, accessibility, source, or link findings in a clear checklist before making customer-facing changes."]);
  if (/document|pdf|letter|proposal|scope|template|approval|version/.test(text)) details.push(["Document operations", "Prepare structured documents, approvals, version notes, and repeatable working outputs without losing the context around them."]);
  if (/finance|cost|savings|debt|rate|receipt|payback|subscription|tax/.test(text)) details.push(["Practical calculations", "Organize inputs, compare options, and preserve the reasoning behind a money or planning decision."]);
  if (/community|neighborhood|civic|public|park|streetlight|volunteer|records|policy/.test(text)) details.push(["Local coordination", "Track public, neighborhood, volunteer, records, or issue-reporting workflows with enough detail for follow-up."]);
  if (/client|business|project|job|meeting|intake|contract|equipment|maintenance|support|sales/.test(text)) details.push(["Business workflow", "Keep customer, job, intake, equipment, support, or project details in one focused workflow for faster decisions."]);
  if (/privacy|security|cleanup|backup|password|two-factor|breach|phishing/.test(text)) details.push(["Security-minded review", "Help plan cleanup, access, backup, or security tasks without asking users to expose sensitive credentials in support requests."]);
  if (!details.length) details.push(["Focused workflow", "Give a narrow recurring task its own clear screen, support route, and customer-facing explanation."]);

  details.push(
    ["Customer support path", `Questions route to ${site.email} with the product name, goal, device or browser, and the exact workflow being attempted.`],
    ["Clear product state", "The page describes current intent and fit without promising public availability, timelines, or unsupported results."],
  );
  return details.slice(0, 4);
}

function toolPage(product, familyLabel) {
  const details = productCapabilityDetails(product);
  const related = [...repoProducts, ...powerhouseProducts]
    .filter((item) => item.slug !== product.slug && item.categoryKey.split(" ").some((key) => product.categoryKey.split(" ").includes(key)))
    .slice(0, 3);
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${product.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(product.icon)}</span><span class="status">${escapeHtml(product.status)}</span></div><p class="eyebrow">${escapeHtml(familyLabel)}</p><h1>${escapeHtml(product.name)}</h1><p class="lede">${escapeHtml(product.summary)}</p><div class="fact-row">${product.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(product.name)}">Get product support</a><a class="button secondary" href="../../apps/">Browse catalog</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${product.name} support request`)}">Email support</a></div></div><div class="product-visual" style="--accent:${product.accent}"><span class="product-visual-label">Product fit</span><span class="app-icon" aria-hidden="true">${escapeHtml(product.icon)}</span><strong>${escapeHtml(product.summary)}</strong><div class="fact-row">${product.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Details</p><h2>What this product helps with</h2></div><p>${escapeHtml(product.name)} is included so customers can understand the intended workflow, ask for help, or request the right tool for their situation.</p></div><div class="feature-list" style="--accent:${product.accent}">${details.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
  <section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">Good fit</p><h2>When to ask about it</h2></aside><article><p>Use this page when the product name matches a workflow you already need to organize, calculate, review, or hand off. If the current product is not the best fit, support can point you toward a better Maxxed app, WordPress plugin, or web tool.</p><p>For a useful request, include the exact workflow, the current tool you use, what is frustrating about it, and whether you need Android, WordPress, browser, or spreadsheet-style output.</p><p><a class="button" href="../../support/?app=${encodeURIComponent(product.name)}">Prepare a ${escapeHtml(product.name)} support ticket</a></p></article></div></div></section>
  <section class="shell section compact"><div class="support-callout" style="--accent:${product.accent}"><div><p class="eyebrow">Product support</p><h2>Get support for ${escapeHtml(product.name)}</h2><p>Open a support ticket pre-selected for this product. Include browser or device details, screenshots when safe, expected result, and actual result.</p></div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(product.name)}">Get support</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${product.name} support request`)}">Email support</a></div></div></section>
  ${related.length ? `<section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Related tools</p><h2>Similar product ideas</h2></div><p>More focused tools in the same public catalog.</p></div><div class="app-grid">${related.map((item) => repoProductCard(item, 2)).join("")}</div></div></section>` : ""}`;
  const schema = [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: product.name, applicationCategory: familyLabel, operatingSystem: "Web", description: product.summary, url: canonical(`tools/${product.slug}/`), author: { "@type": "Organization", name: site.name, url: site.url } }];
  return layout({ title: product.name, description: product.summary, path: `tools/${product.slug}/`, depth: 2, current: "apps", body, schema });
}

function pluginDetails(plugin) {
  const slug = plugin.slug;
  const details = [];
  if (/accessibility|alt-text/.test(slug)) details.push(["Accessibility review", "Track issues that affect visitors using assistive technology and keep follow-up visible until reviewed."]);
  if (/security|role|fraud|compliance|legal|license/.test(slug)) details.push(["Risk review", "Surface operational risk, ownership, review notes, and status without making silent destructive changes."]);
  if (/cleanup|duplicate|purge|stale|orphan|redirect|shortcode/.test(slug)) details.push(["Cleanup planning", "Identify candidates for cleanup, export or review the list, and leave the final decision with the site operator."]);
  if (/price|stock|order|returns|shipping|supplier|woocommerce|margin|product/.test(slug)) details.push(["Commerce workflow", "Support WooCommerce catalog, inventory, order, supplier, or margin review with a controlled operator-first workflow."]);
  if (/schema|nap|service-area|local/.test(slug)) details.push(["Local SEO support", "Help keep business details, schema, service-area planning, and consistency checks easier to review."]);
  if (/content|approval|expiration|maintenance|uptime|form|website/.test(slug)) details.push(["Site operations", "Give website owners a clearer place to review maintenance, publishing, delivery, expiration, or reporting work."]);
  if (!details.length) details.push(["Operational workflow", "Organize the review steps, notes, and status information needed to make the workflow easier to manage."]);

  details.push(
    ["Review-first design", "The plugin is described as a workflow aid, not an automated promise to change site content or data without review."],
    ["Support routing", `Questions and setup requests route through ${site.email} with the plugin name, WordPress version, installed theme, and exact steps.`],
  );

  return details.slice(0, 4);
}

function pluginUseCases(plugin) {
  const words = plugin.name.toLowerCase();
  if (words.includes("audit") || words.includes("checker") || words.includes("finder")) return ["Run a focused review before a maintenance pass.", "Collect notes for the person who owns the site update.", "Recheck after fixes to confirm the visible issue is handled."];
  if (words.includes("portal") || words.includes("approval") || words.includes("request")) return ["Give request or approval work a consistent place to land.", "Track ownership and status without relying on scattered messages.", "Use the plugin as a customer-service or client-review companion."];
  if (words.includes("reporter") || words.includes("digest")) return ["Prepare a readable summary for operators or clients.", "Keep recurring checks from disappearing between maintenance windows.", "Use report history to decide what needs attention next."];
  return ["Capture the item that needs review.", "Add owner, status, or notes in WordPress.", "Use the workflow to decide the next customer-facing action."];
}

function header(depth, current, makeLink = link) {
  const nav = [
    ["apps", "Apps", "apps/"],
    ["plugins", "Plugins", "plugins/"],
    ["beta", "Beta Testers", "beta/"],
    ["roadmap", "Roadmap", "roadmap/"],
    ["about", "About", "about/"],
    ["support", "Help", "support/"],
  ];
  return `<header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="${makeLink(depth)}" aria-label="Maxxed Technical Systems home"><span class="brand-mark" aria-hidden="true">MTS</span><span class="brand-name">Maxxed Technical Systems</span></a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation">☰</button>
      <nav class="nav-links" id="primary-nav" data-nav-links data-open="false" aria-label="Primary navigation">
        ${nav.map(([key, label, path]) => `<a href="${makeLink(depth, path)}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ")}
        <a class="nav-button" href="${makeLink(depth, "support/")}">Get support</a>
      </nav>
    </div>
  </header>`;
}

function adminHeader() {
  return `<header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="/" aria-label="Maxxed Admin home"><span class="brand-mark" aria-hidden="true">MTS</span><span class="brand-name">Maxxed Admin</span></a>
      <nav class="nav-links" aria-label="Admin navigation">
        <a href="/">Testing Functions</a><a href="/products/">Products</a><a href="/plugins/">Plugin Admin</a><a href="https://techmaxxed.com/apps/">Public Catalog</a><a class="nav-button" href="https://techmaxxed.com/support/">Public support</a>
      </nav>
    </div>
  </header>`;
}

function adminLayout({ title, description, path = "", body }) {
  const pageUrl = `https://admin.techmaxxed.com/${path}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Maxxed Admin</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex,nofollow">
  <link rel="canonical" href="${pageUrl}">
  <meta name="theme-color" content="#07131f">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body>
  ${adminHeader()}
  <main id="main">${body}</main>
</body>
</html>`;
}

function footer(depth, makeLink = link) {
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div><a class="brand" href="${makeLink(depth)}"><span class="brand-mark" aria-hidden="true">MTS</span><span>Maxxed Technical Systems</span></a><p>${escapeHtml(site.description)}</p></div>
      <div><h2>Products</h2><ul><li><a href="${makeLink(depth, "apps/")}">All products</a></li><li><a href="${makeLink(depth, "plugins/")}">WordPress tools</a></li><li><a href="${makeLink(depth, "apps/maxxed-remote/")}">Maxxed Remote</a></li><li><a href="${makeLink(depth, "apps/maxxed-compass/")}">Maxxed Compass</a></li><li><a href="${makeLink(depth, "apps/rival-rush/")}">Rival Rush</a></li></ul></div>
      <div><h2>Community</h2><ul><li><a href="${makeLink(depth, "beta/")}">Become a beta tester</a></li><li><a href="${makeLink(depth, "beta-credits/")}">Beta tester credits</a></li><li><a href="${makeLink(depth, "support/")}">Support</a></li></ul></div>
      <div><h2>Policies</h2><ul><li><a href="${makeLink(depth, "privacy/")}">Privacy</a></li><li><a href="${makeLink(depth, "terms/")}">Terms</a></li><li><a href="${makeLink(depth, "accessibility/")}">Accessibility</a></li><li><a href="mailto:${site.email}">Email us</a></li></ul></div>
    </div>
    <div class="shell footer-bottom">© <span data-year></span> Maxxed Technical Systems. Product availability and compatibility vary by app.</div>
  </footer>`;
}

function layout({ title, description, path = "", depth = 0, current = "", body, schema = [], image = "assets/images/og-default.png", noIndex = false, forceRootLinks = false }) {
  const fullTitle = title === site.name ? `${site.name} | Android Apps and Practical Software` : `${title} | ${site.name}`;
  const pageUrl = canonical(path);
  const imageUrl = canonical(image);
  const pageLink = forceRootLinks ? rootLink : link;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.name,
      url: site.url,
      email: site.email,
      logo: canonical("assets/images/favicon.svg"),
    },
    ...schema,
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${noIndex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="theme-color" content="#07131f">
  <link rel="icon" href="${pageLink(depth, "assets/images/favicon.svg")}" type="image/svg+xml">
  <link rel="manifest" href="${pageLink(depth, "site.webmanifest")}">
  <style>${criticalNavCss}</style>
  <link rel="stylesheet" href="${pageLink(depth, "assets/site.css")}">
  ${googleTag()}
  ${schemas.map((item) => `<script type="application/ld+json">${jsonLd(item)}</script>`).join("\n  ")}
</head>
<body data-support-email="${site.email}" data-beta-email="${site.betaEmail}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(depth, current, pageLink)}
  <main id="main">${body}</main>
  ${footer(depth, pageLink)}
  <script src="${pageLink(depth, "assets/site.js")}" defer></script>
</body>
</html>`;
}

function contactBand(depth, heading = "Questions, support, or a product idea?") {
  return `<section class="shell contact-band"><div><h2>${heading}</h2><p>Talk directly with Maxxed Technical Systems.</p></div><a class="button" href="${link(depth, "support/")}">Visit support</a></section>`;
}

const pluginAdminItems = [
  "Accessibility Task Tracker",
  "Affiliate Disclosure Manager",
  "Broken Shortcode Finder",
  "Bulk Price Update Planner",
  "Client Content Approval",
  "Client Maintenance Portal",
  "Contractor Before After Gallery",
  "Database Cleanup Planner",
  "Duplicate Media Finder",
  "Form Delivery Checker",
  "Fraud Review Checklist",
  "Image Alt Text Audit",
  "Legal Page Update Reminder",
  "Local Business Schema Manager",
  "Low Stock Digest",
  "NAP Consistency Checker",
  "Order Export Builder",
  "Orphan Page Finder",
  "Plugin License Inventory",
  "Post Purge Pro",
  "Product Compliance Expiration",
  "Product Data Cleanup",
  "Product Image Audit",
  "Redirect Manager Pro",
  "Returns Request Portal",
  "Scheduled Content Expiration",
  "Security Header Audit",
  "Service Area Page Builder",
  "Shipping Rule Auditor",
  "Stale Content Detector",
  "Stale Inventory Reporter",
  "Supplier Tracker for WooCommerce",
  "Uptime Digest Plugin",
  "Website Maintenance Reporter",
  "WooCommerce Margin Calculator",
  "WordPress Role Auditor",
];

function adminRouteCard(title, text, href, action) {
  return `<article class="admin-route-card"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div><a class="button small" href="${href}">${escapeHtml(action)}</a></article>`;
}

function adminPage() {
  const body = `<section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Admin travel</p><h1>Maxxed admin routing</h1><p class="lede">A direct control hub for jumping between the product catalog, plugin package checks, beta flow, support, and release planning.</p><div class="proof-row"><span>${pluginAdminItems.length} plugin repos checked</span><span>Package review checklist</span><span>Plugin install artifact prepared</span><span>Noindex admin route</span></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Fast paths</p><h2>Travel from one place</h2></div><p>Use these admin routes when testing packages, reviewing listings, checking tester intake, or sending someone to the right public page.</p></div><div class="admin-route-grid">
    ${adminRouteCard("Plugin packages", "Review checked WordPress plugin packages without exposing customer-site Settings pages.", "/plugins/", "Open plugins")}
    ${adminRouteCard("Public catalog", "Open the public product directory with Android apps and current WordPress plugin listings.", "https://techmaxxed.com/apps/", "Open apps")}
    ${adminRouteCard("Beta tester flow", "Jump to the public beta application and tester routing pages.", "https://techmaxxed.com/beta/", "Open beta")}
    ${adminRouteCard("Support routing", "Go directly to the support page and product-specific contact flows.", "https://techmaxxed.com/support/", "Open support")}
    ${adminRouteCard("Release roadmap", "Review the active public release queue and current product priorities.", "https://techmaxxed.com/roadmap/", "Open roadmap")}
    ${adminRouteCard("Policies", "Check privacy, terms, accessibility, and product disclosure pages.", "https://techmaxxed.com/privacy/", "Open policies")}
  </div></section>`;
  return adminLayout({ title: "Admin Routing", description: "Admin routing hub for Maxxed Technical Systems product catalog, plugin package checks, beta, support, roadmap, and policy travel.", path: "", body });
}

function adminPluginsPage() {
  const plugins = pluginAdminItems.map((name) => `<article class="plugin-admin-item"><h3>${escapeHtml(name)}</h3><p>Package listed for private review. Customer installs should not receive separate Maxxed test profile pages in the WordPress admin menu.</p><span>Package review needed</span></article>`).join("");
  const body = `<section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Plugin packages</p><h1>WordPress plugin package review</h1><p class="lede">Track plugin package readiness without exposing customer-site profile routes from the Maxxed site.</p><div class="proof-row"><span>${pluginAdminItems.length} plugin folders</span><span>${pluginAdminItems.length} package checks</span><span>No customer profile route claims</span><span>Ready for package remediation</span></div><div class="hero-actions"><a class="button" href="/">Back to admin hub</a><a class="button secondary" href="https://techmaxxed.com/apps/">Open public catalog</a></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Package list</p><h2>Checked repo list</h2></div><p>Each plugin should keep customer-facing configuration inside its own plugin workflow only when it is truly needed. Internal test labels must not appear as separate customer profile pages.</p></div><div class="plugin-admin-grid">${plugins}</div></section>`;
  return adminLayout({ title: "WordPress Plugin Admin", description: "Admin view of checked WordPress plugin packages without customer-site profile route claims.", path: "plugins/", body });
}

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

function adminProductCard(product) {
  return `<a class="admin-product-card" data-app-card data-category="${escapeHtml(product.family.toLowerCase())}" href="${escapeHtml(product.route)}"><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.summary)}</p><div class="admin-meta"><span class="admin-pill">${escapeHtml(product.family)}</span><span class="admin-pill">${escapeHtml(product.state)}</span></div></a>`;
}

function adminProductsPage() {
  const products = adminCatalogRecords();
  const body = `<section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Product registry</p><h1>Admin product catalog</h1><p class="lede">A private admin copy of the Maxxed catalog, including public products plus admin-tracked upcoming items such as Aspiration.</p><div class="proof-row"><span>${products.length} admin catalog entries</span><span>${apps.length} Android apps</span><span>${wordpressPlugins.length} WordPress tools</span><span>${repoProducts.length + powerhouseProducts.length} web and business tools</span></div></div></section>
  <section class="admin-shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search admin catalog</span><input type="search" data-app-search placeholder="Search products, plugins, tools, or status" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter admin catalog"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="android" aria-pressed="false">Android</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button><button class="filter" data-filter="focused" aria-pressed="false">Web tools</button><button class="filter" data-filter="business" aria-pressed="false">Business</button><button class="filter" data-filter="upcoming" aria-pressed="false">Upcoming</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><p class="empty-state" data-empty-state hidden>No admin catalog entries match that search.</p><div class="admin-product-grid" data-catalog>${products.map(adminProductCard).join("")}</div><p class="fine-print">Source data: <span class="admin-code">/data/product-registry.json</span>. Public product links intentionally leave the admin subdomain; admin-only products stay inside this portal.</p></section>`;
  return adminLayout({ title: "Products", description: "Private admin copy of the Maxxed product catalog with public products and admin-tracked upcoming app entries.", path: "products/", body });
}

function adminAspirationPage() {
  const body = `<section class="band admin-hero"><div class="shell section compact"><p class="eyebrow">Upcoming app</p><h1>Aspiration</h1><p class="lede">Admin-tracked aspiration planning app entry for product scoping, routing, and future build review.</p><div class="proof-row"><span>Admin tracked</span><span>Upcoming app</span><span>support@techmaxxed.com</span></div></div></section>
  <section class="admin-shell section"><div class="admin-list"><article><h2>Current intent</h2><p>Keep Aspiration visible in the admin catalog while the public product page and build scope are still being defined.</p></article><article><h2>Routing</h2><p><a class="button small" href="/products/">Back to product catalog</a> <a class="button secondary small" href="mailto:${site.email}?subject=${encodeURIComponent("Aspiration app planning")}">Email planning notes</a></p></article></div></section>`;
  return adminLayout({ title: "Aspiration", description: "Admin-tracked Aspiration app route for product scoping and future build review.", path: "products/aspiration/", body });
}

function homePage() {
  const featured = apps.slice(0, 4);
  const pluginHighlights = wordpressPlugins.slice(0, 6);
  const repoHighlights = [...repoProducts.slice(0, 3), ...powerhouseProducts.slice(0, 3)];
  const body = `<section class="band home-hero">
    <div class="shell home-hero-grid">
      <div><p class="eyebrow">Android apps + WordPress tools + practical software</p><h1>Maxxed Technical Systems</h1><p class="lede">Useful tools built to do the job, from controlling a television and finding true north to organizing WordPress audits, maintenance, cleanup, commerce workflows, and focused web utilities.</p><div class="hero-actions"><a class="button" href="apps/">Explore all products</a><a class="button secondary" href="roadmap/">See what is next</a></div><div class="proof-row"><span>${allPublicProducts.length} public products</span><span>${apps.length} Android apps</span><span>${wordpressPlugins.length} WordPress tools</span><span>${repoProducts.length + powerhouseProducts.length} software concepts</span></div></div>
      <div class="hero-products" aria-label="Featured Maxxed apps"><div class="hero-shot"><img src="assets/images/remote-control.png" alt="Maxxed Remote Android app main control screen" width="1080" height="1920"></div><div class="hero-stack">${featured.map((app) => `<a class="mini-product" style="--accent:${app.accent}" href="apps/${app.slug}/"><span class="mini-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><strong>${escapeHtml(app.short)}</strong><small>${escapeHtml(app.category)}</small></a>`).join("")}</div></div>
    </div>
  </section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Android apps</p><h2>Built around real tasks</h2></div><p>Each Android product states what it does, what remains in testing, how data is handled, and where the limits are. Even apps still in development can be requested for pre-release testing when a useful tester is ready.</p></div><div class="app-grid">${apps.map((app, index) => appCard(app, 0, index < 2)).join("")}</div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">WordPress tools</p><h2>${wordpressPlugins.length} WordPress workflows in the catalog</h2></div><p>These products help site owners review accessibility, maintenance, cleanup, commerce, schema, content, and operations work inside WordPress.</p></div><div class="app-grid">${pluginHighlights.map((plugin) => pluginCard(plugin)).join("")}</div><div class="hero-actions"><a class="button secondary" href="apps/">View all ${wordpressPlugins.length} WordPress tools</a></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Software product library</p><h2>${repoProducts.length + powerhouseProducts.length} additional software concepts</h2></div><p>Focused web tools and business utilities are included in the catalog so customers can see what is available, request testing, or ask which tool fits their workflow.</p></div><div class="app-grid">${repoHighlights.map((product) => repoProductCard(product)).join("")}</div><div class="hero-actions"><a class="button secondary" href="apps/">Browse all ${allPublicProducts.length} products</a></div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">How we build</p><h2>Truth before hype</h2></div><p>Useful software earns trust through clear claims, careful handling of private data, and physical testing where sensors, cameras, televisions, or field conditions matter.</p></div><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Clear release states</h3><p>In-development tools are never presented as publicly available products.</p></article><article class="truth-item"><h3>Privacy by design</h3><p>On-device processing and explicit exports are preferred wherever the workflow supports them.</p></article><article class="truth-item"><h3>Evidence-based results</h3><p>Measurements and estimates expose uncertainty and never pretend a visual result is laboratory truth.</p></article></div></div></section>
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Current focus</p><h2>Release queue and WordPress tools</h2></div><p>The Android release queue stays focused while WordPress tools move through organized customer-facing testing.</p></div><div class="road-list">${roadmap.slice(0, 4).map((item, index) => `<div class="road-item"><span class="number">0${index + 1}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div><div class="hero-actions"><a class="button secondary" href="roadmap/">View the full release queue</a></div></section>
  <section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Test with us</p><h2>Android beta testers wanted</h2></div><p>Choose the apps you want to test, including products still marked as development. A strong pre-release request helps us prioritize that app, finish the launch pass quickly, and get a tester build in front of you.</p></div><div class="hero-actions"><a class="button" href="beta/">Apply to beta test</a><a class="button secondary" href="beta-credits/">View tester credits</a></div></div></section>
  ${contactBand(0)}`;
  return layout({
    title: site.name,
    description: site.description,
    body,
    schema: [{ "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, potentialAction: { "@type": "SearchAction", target: `${site.url}/apps/?q={search_term_string}`, "query-input": "required name=search_term_string" } }],
  });
}

function appsPage() {
  const guideLinks = [
    ["Android utility apps", "TV remote, compass, measurement, field, and outdoor Android products.", "android-utility-apps/"],
    ["WordPress cleanup plugins", "Cleanup, audit, stale content, redirects, roles, and maintenance tools.", "wordpress-cleanup-plugins/"],
    ["Camera measurement apps", "Known-reference measurement, catch records, and visual estimate workflows.", "camera-measurement-apps/"],
    ["Compass and outdoor tools", "Field-ready compass, trip, sky, fishing, and outdoor workflows.", "compass-outdoor-tools/"],
    ["Beta testing Android apps", "Request pre-release access and help prioritize the next launch pass.", "beta-testing-android-apps/"],
  ].map(([title, text, path]) => `<a class="support-option" href="../${path}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><span class="app-meta">Open guide -></span></a>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product directory</p><h1>Android apps, WordPress tools, and software</h1><p class="lede">Browse Maxxed products by section. Android apps have dedicated product, README, privacy, and support pages. WordPress tools now have individual detail and README pages for clearer discovery.</p></div></section>
  <section class="shell section compact"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search products</span><input type="search" data-app-search placeholder="Search by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter products"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="utility" aria-pressed="false">Utilities</button><button class="filter" data-filter="outdoors" aria-pressed="false">Outdoors</button><button class="filter" data-filter="games" aria-pressed="false">Games</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button><button class="filter" data-filter="repo" aria-pressed="false">Web tools</button><button class="filter" data-filter="powerhouse" aria-pressed="false">Business tools</button><button class="filter" data-filter="business" aria-pressed="false">Business</button><button class="filter" data-filter="civic" aria-pressed="false">Civic</button><button class="filter" data-filter="content" aria-pressed="false">Content</button><button class="filter" data-filter="finance" aria-pressed="false">Finance</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><p class="empty-state" data-empty-state hidden>No products match that search. Try a product name or a broader category.</p></section>
  <section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Product guides</p><h2>Find the right starting point</h2></div><p>These focused guides give search visitors and customers a clearer path into the catalog.</p></div><div class="support-grid">${guideLinks}</div></div></section>
  <section class="shell section catalog-section" data-catalog><div class="section-head"><div><p class="eyebrow">Android apps</p><h2>Mobile products with full support pages</h2></div><p>Each app includes product details, a public README, app privacy policy, beta testing route, and app-specific support link.</p></div><div class="app-grid">${apps.map((app, index) => appCard(app, 1, index < 2)).join("")}</div></section>
  <section class="band catalog-section" data-catalog><div class="shell section"><div class="section-head"><div><p class="eyebrow">WordPress tools</p><h2>${wordpressPlugins.length} plugin workflows</h2></div><p>Each plugin has a detail page and README covering purpose, use cases, support routing, and weekly review expectations.</p></div><div class="app-grid">${wordpressPlugins.map((plugin) => pluginCard(plugin, 1)).join("")}</div></div></section>
  <section class="shell section catalog-section" data-catalog><div class="section-head"><div><p class="eyebrow">Focused web tools</p><h2>${repoProducts.length} web tool concepts</h2></div><p>Focused tools for forms, documents, local SEO, civic workflows, evidence capture, and practical operations. Every card opens a product page with support routing.</p></div><div class="app-grid dense-grid">${repoProducts.map((product) => repoProductCard(product, 1)).join("")}</div></section>
  <section class="band catalog-section" data-catalog><div class="shell section"><div class="section-head"><div><p class="eyebrow">Business tools</p><h2>${powerhouseProducts.length} business utility concepts</h2></div><p>Business and household operations concepts are grouped separately so the primary app and plugin catalog stays readable. Every card opens a product page with support routing.</p></div><div class="app-grid dense-grid">${powerhouseProducts.map((product) => repoProductCard(product, 1)).join("")}</div></div></section>${contactBand(1, "Need help choosing the right product?")}`;
  const schema = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Maxxed product directory", url: canonical("apps/"), mainEntity: { "@type": "ItemList", numberOfItems: allPublicProducts.length, itemListElement: allPublicProducts.slice(0, 50).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name })) } }];
  return layout({ title: "Apps", description: "Browse Maxxed Android apps, WordPress plugin workflows, focused web tools, and business utilities grouped into clearer customer-facing sections.", path: "apps/", depth: 1, current: "apps", body, schema });
}

function pluginsPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">WordPress tools</p><h1>WordPress plugins</h1><p class="lede">Browse Maxxed WordPress tools for audits, cleanup, maintenance, commerce, schema, content, and operations workflows.</p><div class="proof-row"><span>${wordpressPlugins.length} WordPress tools</span><span>Review-first workflows</span><span>Configurable admin screens</span><span>Customer-ready catalog</span></div></div></section>
  <section class="shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search plugins</span><input type="search" data-app-search placeholder="Search plugins by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter plugins"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="wordpress" aria-pressed="false">WordPress</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><div class="app-grid" data-catalog>${wordpressPlugins.map((plugin) => pluginCard(plugin, 1)).join("")}</div><p class="empty-state" data-empty-state hidden>No plugins match that search. Try a plugin name or a broader capability.</p></section>${contactBand(1, "Need help with a WordPress plugin?")}`;
  const schema = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Maxxed WordPress plugins", url: canonical("plugins/"), mainEntity: { "@type": "ItemList", numberOfItems: wordpressPlugins.length, itemListElement: wordpressPlugins.map((plugin, index) => ({ "@type": "ListItem", position: index + 1, name: plugin.name, url: canonical(`plugins/${plugin.slug}/`) })) } }];
  return layout({ title: "WordPress Plugins", description: "Browse Maxxed Technical Systems WordPress plugin pages for audits, cleanup, maintenance, commerce, schema, content, and operations workflows.", path: "plugins/", depth: 1, current: "plugins", body, schema });
}

function seoLandingPage({ title, path, eyebrow, heading, lede, intro, cards, cardRenderer, proof, supportSubject, faqs }) {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(heading)}</h1><p class="lede">${escapeHtml(lede)}</p><div class="proof-row">${proof.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../support/?app=${encodeURIComponent(supportSubject)}&issue=${encodeURIComponent("Feature request")}">Ask for help</a><a class="button secondary" href="../apps/">Browse all products</a></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Recommended products</p><h2>Start here</h2></div><p>${escapeHtml(intro)}</p></div><div class="app-grid">${cards.map((item) => cardRenderer(item)).join("")}</div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Questions</p><h2>What customers usually ask</h2></div><p>Use these notes to choose the right product or send a cleaner support request.</p></div><div class="faq-list">${faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div></div></section>
  ${contactBand(1, `Need help with ${supportSubject}?`)}`;
  const schema = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: heading, url: canonical(path), description: lede, mainEntity: { "@type": "ItemList", numberOfItems: cards.length, itemListElement: cards.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name })) } },
    faqSchema(faqs),
  ];
  return layout({ title, description: lede, path, depth: 1, current: "apps", body, schema });
}

function androidUtilityAppsPage() {
  const utilityApps = apps.filter((app) => ["utility", "outdoors"].includes(app.categoryKey));
  return seoLandingPage({
    title: "Android Utility Apps",
    path: "android-utility-apps/",
    eyebrow: "Android utilities",
    heading: "Android utility apps for everyday jobs",
    lede: "Browse Maxxed Android utility apps for TV control, compass navigation, camera measurement, visual estimating, and private field records.",
    intro: "These apps are built for practical device tasks where permissions, limitations, and support expectations need to be clear before someone installs a build.",
    cards: utilityApps,
    cardRenderer: (app) => appCard(app, 1),
    proof: ["Android first", "App privacy pages", "Pre-release testing", "Support by app"],
    supportSubject: "Android utility apps",
    faqs: [
      ["Can I request testing before an app is public?", "Yes. A useful pre-release request can help prioritize an app for a focused launch pass and real-device testing."],
      ["Do these apps require accounts?", "The current public descriptions favor local or on-device workflows unless a product page says otherwise."],
      ["Where do I get help?", "Each app page links to a support ticket with that app preselected."],
    ],
  });
}

function wordpressCleanupPluginsPage() {
  const cleanupPlugins = wordpressPlugins.filter((plugin) => /cleanup|duplicate|purge|stale|orphan|redirect|shortcode|maintenance|security|accessibility|alt|legal|license|role/.test(plugin.slug));
  return seoLandingPage({
    title: "WordPress Cleanup Plugins",
    path: "wordpress-cleanup-plugins/",
    eyebrow: "WordPress cleanup",
    heading: "WordPress cleanup and audit plugins",
    lede: "Explore Maxxed WordPress plugins for stale content, duplicate media, redirects, shortcodes, accessibility, roles, legal reviews, and maintenance reporting.",
    intro: "The cleanup catalog is review-first: it helps identify work, organize notes, and route support without implying unsafe automatic deletion.",
    cards: cleanupPlugins,
    cardRenderer: (plugin) => pluginCard(plugin, 1),
    proof: ["Review-first", "Support routing", "Weekly README reviews", "WordPress workflows"],
    supportSubject: "WordPress cleanup plugins",
    faqs: [
      ["Do cleanup plugins delete content automatically?", "Public pages describe review workflows and support routing; destructive actions should stay explicit and operator controlled."],
      ["Can I ask which plugin fits my site?", "Yes. Send the site type, WordPress version, theme, and the cleanup problem you are trying to solve."],
      ["Are plugin READMEs public?", "Every listed WordPress plugin has a public README page and should be reviewed weekly while listed."],
    ],
  });
}

function cameraMeasurementAppsPage() {
  const measurementApps = apps.filter((app) => ["maxxed-measure", "maxxed-gold-estimator", "fishing-maxxed"].includes(app.slug));
  return seoLandingPage({
    title: "Camera Measurement Apps",
    path: "camera-measurement-apps/",
    eyebrow: "Camera workflows",
    heading: "Camera measurement and visual estimate apps",
    lede: "Review Maxxed camera-assisted apps for known-reference measurement, catch records, visual material estimates, uncertainty, and explicit user exports.",
    intro: "Camera-assisted tools are useful only when the page is honest about references, uncertainty, lighting, user correction, and what the app cannot prove.",
    cards: measurementApps,
    cardRenderer: (app) => appCard(app, 1),
    proof: ["Known references", "Visible uncertainty", "Local history", "Export by choice"],
    supportSubject: "camera measurement apps",
    faqs: [
      ["Are camera measurements exact?", "No. Product pages describe estimates, references, correction handles, uncertainty, and limitations."],
      ["Can images stay local?", "The current public descriptions prefer local storage and user-directed exports where the app supports it."],
      ["What should testers report?", "Lighting, distance, reference size, device model, expected result, actual result, and screenshots when safe."],
    ],
  });
}

function compassOutdoorToolsPage() {
  const outdoorApps = apps.filter((app) => ["maxxed-compass", "fishing-maxxed", "maxxed-gold-estimator"].includes(app.slug));
  return seoLandingPage({
    title: "Compass and Outdoor Tools",
    path: "compass-outdoor-tools/",
    eyebrow: "Outdoor tools",
    heading: "Compass, field, and outdoor Android tools",
    lede: "Find Maxxed outdoor apps for compass headings, trip tracking, sky scanning, catch records, field estimates, and privacy-minded exports.",
    intro: "Outdoor software needs real device testing because sensors, lighting, weather, location, and field conditions change how well the tool works.",
    cards: outdoorApps,
    cardRenderer: (app) => appCard(app, 1),
    proof: ["Sensor testing", "Offline workflows", "Location control", "Field records"],
    supportSubject: "compass and outdoor tools",
    faqs: [
      ["Why does compass accuracy vary?", "Accuracy depends on device sensors, calibration, magnetic interference, and field conditions."],
      ["Can I test an outdoor app early?", "Yes. Useful testers with relevant devices and real outdoor use cases can request pre-release testing."],
      ["Do outdoor records expose exact location?", "Product pages and privacy policies explain location behavior and export controls for each app."],
    ],
  });
}

function betaTestingLandingPage() {
  return seoLandingPage({
    title: "Beta Testing Android Apps",
    path: "beta-testing-android-apps/",
    eyebrow: "Tester access",
    heading: "Beta testing for Maxxed Android apps",
    lede: "Apply to test Maxxed Android apps, request pre-release access for development-stage products, and help prioritize the next launch pass.",
    intro: "Beta testers help by installing real builds, trying the product in normal conditions, and sending specific feedback that can be reproduced.",
    cards: apps,
    cardRenderer: (app) => appCard(app, 1),
    proof: ["Choose apps", "Voluntary testing", "Optional credit", "Real-device feedback"],
    supportSubject: "Android beta testing",
    faqs: [
      ["Can I request a product that is not public yet?", "Yes. That is exactly what pre-release testing is for when the tester and product are a good fit."],
      ["Is beta testing paid?", "No. Public pages describe testing as voluntary and unpaid, with optional public credit when approved by the tester."],
      ["How do I apply?", "Use the beta form and include your Google Account, device, Android version, selected apps, and useful testing notes."],
    ],
  });
}

function productPage(app) {
  const featureVisual = app.featureImage
    ? `<div class="feature-image"><img src="../../assets/images/${app.featureImage}" alt="${escapeHtml(app.name)} feature graphic" width="1024" height="500"></div>`
    : `<div class="product-visual" style="--accent:${app.accent}"><span class="product-visual-label">Product focus</span><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><strong>${escapeHtml(app.tagline)}</strong><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></div>`;
  const screenshots = app.screenshots ? `<section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Interface</p><h2>See the app in action</h2></div><p>Current preview screens from the Android app.</p></div><div class="screenshot-strip">${app.screenshots.map(([src, alt]) => `<figure><img src="../../assets/images/${src}" alt="${escapeHtml(alt)}" width="1080" height="1920" loading="lazy"><figcaption>${escapeHtml(alt)}</figcaption></figure>`).join("")}</div></div></section>` : "";
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${app.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><p class="eyebrow">${escapeHtml(app.category)} app</p><h1>${escapeHtml(app.name)}</h1><p class="lede">${escapeHtml(app.description)}</p><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../beta/?app=${app.slug}">Request pre-release testing</a><a class="button secondary" href="privacy/">App privacy</a><a class="button secondary" href="readme/">README</a><a class="button secondary" href="../../support/?app=${encodeURIComponent(app.name)}">Support</a></div></div>${featureVisual}</div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Capabilities</p><h2>What ${escapeHtml(app.short)} does</h2></div><p>${escapeHtml(app.summary)}</p></div><div class="feature-list" style="--accent:${app.accent}">${app.features.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
  ${screenshots}
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Product truth</p><h2>Status, privacy, and limits</h2></div><p>Clear expectations are part of the product, not an afterthought.</p></div><div class="truth-grid" style="--accent:${app.accent}"><article class="truth-item"><h3>Availability</h3><p>${escapeHtml(app.availability)} Pre-release testing requests are welcome even before a public store launch.</p></article><article class="truth-item"><h3>Privacy</h3><p>${escapeHtml(app.privacy)} <a href="privacy/">Read the detailed ${escapeHtml(app.name)} privacy policy.</a></p></article><article class="truth-item"><h3>Important limitation</h3><p>${escapeHtml(app.limitation)}</p></article></div></section>
  <section class="band"><div class="shell section compact"><div class="support-callout" style="--accent:${app.accent}"><div><p class="eyebrow">App support</p><h2>Get support for ${escapeHtml(app.name)}</h2><p>Open a ticket pre-selected for ${escapeHtml(app.name)}. Include device model, Android version, app version when available, exact steps, expected result, and actual result.</p></div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(app.name)}">Get ${escapeHtml(app.name)} support</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${app.name} support request`)}">Email support</a></div></div></div></section>
  <section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Explore more</p><h2>Other Maxxed apps</h2></div><p>Focused products for different real-world jobs.</p></div><div class="app-grid">${apps.filter((item) => item.slug !== app.slug).slice(0, 3).map((item) => appCard(item, 2)).join("")}</div></div></section>${contactBand(2, `Need help with ${app.name}?`)}`;
  const schema = [{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.category === "Party game" ? "GameApplication" : "UtilitiesApplication",
    operatingSystem: "Android",
    description: app.summary,
    url: canonical(`apps/${app.slug}/`),
    author: { "@type": "Organization", name: site.name, url: site.url },
  }];
  return layout({ title: app.name, description: app.summary, path: `apps/${app.slug}/`, depth: 2, current: "apps", body, schema, image: app.featureImage ? `assets/images/${app.featureImage}` : "assets/images/og-default.png" });
}

function appReadmePage(app) {
  const body = `<section class="band"><div class="shell section compact"><div class="product-kicker" style="--accent:${app.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">README</span></div><p class="eyebrow">${escapeHtml(app.category)} app</p><h1>${escapeHtml(app.name)} README</h1><p class="lede">${escapeHtml(app.summary)}</p><div class="hero-actions"><a class="button" href="../../../beta/?app=${app.slug}">Request pre-release testing</a><a class="button secondary" href="../">Product page</a><a class="button secondary" href="../privacy/">Privacy policy</a><a class="button secondary" href="../../../support/?app=${encodeURIComponent(app.name)}">Support ticket</a></div></div></section>
  <section class="shell section"><div class="copy-grid"><aside><p>This public README summarizes the app purpose, release state, support routing, privacy link, and known limitations for testers and early users.</p><p>README pages should be reviewed and updated at least once each week while an app is active, in development, or moving toward release.</p><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></aside><article><h2>Purpose</h2><p>${escapeHtml(app.description)}</p><h2>Current Status</h2><p><strong>${escapeHtml(app.status)}.</strong> ${escapeHtml(app.availability)}</p><h2>Pre-release Testing</h2><p>Even if ${escapeHtml(app.name)} is still in development, testers can request access. A clear request helps us prioritize the next launch pass, prepare a tester build quickly when feasible, and collect real-device feedback before public release.</p><h2>Core Workflow</h2><ol class="readme-steps">${app.features.map(([title, text]) => `<li><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></li>`).join("")}</ol><h2>Privacy</h2><p>${escapeHtml(app.privacy)} The full app-specific policy is available at <a href="../privacy/">${escapeHtml(app.name)} Privacy Policy</a>.</p><h2>Known Limitation</h2><p>${escapeHtml(app.limitation)}</p><h2>Weekly Review</h2><p>This README should stay in sync with the app source, privacy policy, support flow, testing status, and latest GitHub PR work. Review it at least once per week and update stale claims before launch decisions.</p><h2>Support</h2><p>For a useful ticket, include app version, device model, Android version, exact steps, expected result, actual result, and whether the issue repeats.</p><p><a class="button" href="../../../support/?app=${encodeURIComponent(app.name)}">Prepare a ${escapeHtml(app.name)} support ticket</a></p></article></div></section>`;
  return layout({ title: `${app.name} README`, description: `Read the ${app.name} README with purpose, status, workflow, privacy link, support details, and known limitations.`, path: `apps/${app.slug}/readme/`, depth: 3, current: "apps", body });
}

function pluginPage(plugin) {
  const details = pluginDetails(plugin);
  const useCases = pluginUseCases(plugin);
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${plugin.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">${escapeHtml(plugin.status)}</span></div><p class="eyebrow">WordPress plugin</p><h1>${escapeHtml(plugin.name)}</h1><p class="lede">${escapeHtml(plugin.summary)}</p><div class="fact-row">${plugin.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(plugin.name)}">Get plugin support</a><a class="button secondary" href="readme/">README</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${plugin.name} support request`)}">Email support</a></div></div><div class="product-visual" style="--accent:${plugin.accent}"><span class="product-visual-label">Plugin focus</span><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><strong>${escapeHtml(plugin.summary)}</strong><div class="fact-row">${plugin.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Details</p><h2>What this plugin helps with</h2></div><p>${escapeHtml(plugin.name)} is documented as a review-first WordPress workflow tool with support routed through ${site.email}.</p></div><div class="feature-list" style="--accent:${plugin.accent}">${details.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
  <section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">Use cases</p><h2>When to use it</h2></aside><article><ol class="readme-steps">${useCases.map((text) => `<li><strong>${escapeHtml(text)}</strong><span>Keep the workflow visible in WordPress and route questions through support when behavior is unclear.</span></li>`).join("")}</ol><p><a class="button" href="readme/">Read the ${escapeHtml(plugin.name)} README</a></p></article></div></div></section>
  <section class="shell section compact"><div class="support-callout" style="--accent:${plugin.accent}"><div><p class="eyebrow">Plugin support</p><h2>Get support for ${escapeHtml(plugin.name)}</h2><p>Include the WordPress version, active theme, plugin version or package date, exact screen, expected result, and actual result.</p></div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(plugin.name)}">Prepare support ticket</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${plugin.name} support request`)}">Email support</a></div></div></section>
  <section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">More WordPress tools</p><h2>Related plugin workflows</h2></div><p>Explore adjacent review-first tools in the Maxxed WordPress catalog.</p></div><div class="app-grid">${wordpressPlugins.filter((item) => item.slug !== plugin.slug).slice(0, 3).map((item) => pluginCard(item, 2)).join("")}</div></div></section>`;
  const schema = [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: plugin.name, applicationCategory: "WordPressPlugin", operatingSystem: "WordPress", description: plugin.summary, url: canonical(`plugins/${plugin.slug}/`), author: { "@type": "Organization", name: site.name, url: site.url } }];
  return layout({ title: plugin.name, description: `${plugin.name} is a Maxxed WordPress plugin for ${plugin.summary.toLowerCase()}`, path: `plugins/${plugin.slug}/`, depth: 2, current: "plugins", body, schema });
}

function pluginReadmePage(plugin) {
  const details = pluginDetails(plugin);
  const useCases = pluginUseCases(plugin);
  const body = `<section class="band"><div class="shell section compact"><div class="product-kicker" style="--accent:${plugin.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(plugin.icon)}</span><span class="status">README</span></div><p class="eyebrow">WordPress plugin</p><h1>${escapeHtml(plugin.name)} README</h1><p class="lede">${escapeHtml(plugin.summary)}</p><div class="hero-actions"><a class="button" href="../../../support/?app=${encodeURIComponent(plugin.name)}">Support ticket</a><a class="button secondary" href="../">Plugin page</a><a class="button secondary" href="mailto:${site.email}?subject=${encodeURIComponent(`${plugin.name} support request`)}">Email support</a></div></div></section>
  <section class="shell section"><div class="copy-grid"><aside><p>This public README summarizes the plugin purpose, review workflow, customer-facing support route, and weekly maintenance expectation.</p><p>Plugin README pages should be reviewed and updated at least once each week while the plugin is listed publicly or being tested.</p><div class="fact-row">${plugin.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></aside><article><h2>Purpose</h2><p>${escapeHtml(plugin.summary)}</p><h2>Current Status</h2><p><strong>${escapeHtml(plugin.status)}.</strong> This plugin is listed as a customer-facing WordPress workflow tool. Support and setup questions route to ${site.email}.</p><h2>Core Workflow</h2><ol class="readme-steps">${details.map(([title, text]) => `<li><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></li>`).join("")}</ol><h2>Common Use Cases</h2><ul>${useCases.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul><h2>Support</h2><p>For a useful ticket, include WordPress version, active theme, plugin version or package date, exact screen, expected result, actual result, and whether the issue repeats.</p><p><a class="button" href="../../../support/?app=${encodeURIComponent(plugin.name)}">Prepare a ${escapeHtml(plugin.name)} support ticket</a></p><h2>Weekly Review</h2><p>This README should stay in sync with the plugin package, customer-facing plugin page, support route, and latest GitHub PR work. Review it at least once per week and update stale claims before launch or customer handoff decisions.</p></article></div></section>`;
  return layout({ title: `${plugin.name} README`, description: `Read the ${plugin.name} README with purpose, workflow details, support routing, and weekly review expectations.`, path: `plugins/${plugin.slug}/readme/`, depth: 3, current: "plugins", body });
}

function roadmapPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Current product focus</p><h1>Seven-product release queue</h1><p class="lede">Our public focus stays intentionally narrow: six active Android products and one next product. Statuses describe current work, not availability promises.</p></div></section><section class="shell section"><div class="road-list">${roadmap.map((item, index) => `<div class="road-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div></section><section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">How priorities move</p><h2>Finish before expanding</h2></aside><article><p>Current Android products receive functionality, physical testing, store materials, privacy review, and truthful readiness reports before additional concepts enter public development.</p><p>Future ideas remain private until they have a real implementation path and a place in the release queue.</p><p><a class="button" href="../beta/">Apply to beta test</a></p></article></div></div></section>${contactBand(1, "Questions about the current release queue?")}`;
  return layout({ title: "Roadmap", description: "Follow the seven-product Tech Maxxed release queue for six active Android apps and the next near-term product.", path: "roadmap/", depth: 1, current: "roadmap", body });
}

function aboutPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">The company</p><h1>About Maxxed Technical Systems</h1><p class="lede">A security-minded product studio building practical software with a bias toward clear workflows, honest claims, and useful outcomes.</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>Maxxed Technical Systems develops Android apps, small business tools, field workflows, and focused software products.</p></aside><article><h2>Why these products exist</h2><p>Many everyday tools become crowded with accounts, subscriptions, unnecessary data collection, or features that obscure the job. Maxxed products start from the task itself and keep the interface centered on completing it.</p><h2>How products are evaluated</h2><p>A build is not treated as release-ready because it compiles. Camera workflows need known-object tests. Compass features need outdoor sensor tests. Television control needs real model compatibility checks. Estimates need visible limitations and conservative ranges.</p><h2>A consistent private foundation</h2><p>Our products share a privately maintained foundation for common quality, privacy, security, and release practices. We publish what users need to understand each product while keeping internal systems, credentials, and operational details private.</p><h2>What the name represents</h2><p>“Maxxed” means pushing a practical tool toward its most useful form while remaining direct about what software can and cannot prove.</p></article></div></section><section class="band"><div class="shell section compact"><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Focused</h3><p>Each product should solve a recognizable job without burying it in unnecessary navigation.</p></article><article class="truth-item"><h3>Accountable</h3><p>Status, privacy behavior, and product limitations are written in plain language.</p></article><article class="truth-item"><h3>Security-minded</h3><p>Access is minimized, sensitive details stay private, and public claims remain limited to what users need.</p></article></div></div></section>${contactBand(1, "Questions about Maxxed Technical Systems?")}`;
  return layout({ title: "About", description: "Learn how Maxxed Technical Systems builds practical Android apps and software around focused workflows, honest product claims, and real-world testing.", path: "about/", depth: 1, current: "about", body });
}

function supportPage() {
  const guidanceOptions = [
    { name: "General product guidance" },
    { name: "Android utility apps" },
    { name: "WordPress cleanup plugins" },
    { name: "camera measurement apps" },
    { name: "compass and outdoor tools" },
    { name: "Android beta testing" },
  ];
  const supportProducts = [...guidanceOptions, ...allPublicProducts];
  const options = supportProducts.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  const issueTypes = [
    ["Setup or install", "Pairing, test access, install, update, or first-run problems."],
    ["Bug or crash", "Something breaks, crashes, freezes, miscalculates, or fails to save."],
    ["UX confusion", "A screen, control, label, flow, or result is unclear."],
    ["Privacy or data", "Questions about permissions, exports, local records, deletion, or sharing."],
    ["Feature request", "A workflow, app, setting, export, or quality-of-life improvement."],
    ["Pre-release testing", "Request tester access for an app even if it is still in development."],
  ];
  const issueOptions = issueTypes.map(([name]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  const issueCards = issueTypes.map(([name, text]) => `<button class="ticket-type" type="button" data-issue-preset="${escapeHtml(name)}"><h3>${escapeHtml(name)}</h3><p>${escapeHtml(text)}</p></button>`).join("");
  const faqs = [
    ["What should a bug report include?", "App name and version, phone model, Android version, exact steps, expected result, actual result, and a screenshot when it does not expose sensitive information."],
    ["Where are downloads and Play Store links?", "Links will appear on each product page only after that app reaches its verified public release state."],
    ["Can support recover deleted local data?", "Usually not. Several Maxxed apps intentionally keep records on the device and do not maintain a cloud copy."],
    ["How do I become a beta tester?", "Use the beta tester application to select the Android apps you want to test. Participation is voluntary and unpaid, with optional public credit."],
  ];
  const quickHelp = [
    ["Maxxed Remote", "Check that the phone and TV are on the same private network, then approve the pairing request on the television."],
    ["Maxxed Compass", "Move away from magnetic cases, chargers, vehicles, and steel structures before recalibrating the device."],
    ["Maxxed Measure", "Keep the known-size reference in the same plane as the subject and correct both measurement endpoints."],
    ["Maxxed Gold Estimator", "Use even lighting, a visible scale reference, and all requested angles. Results are visual estimates, not assays."],
    ["Fishing Maxxed", "Use a clear known-length reference and always confirm current regulations through an official source."],
    ["Rival Rush", "Confirm the tester Google Account is eligible, update through Google Play, and report the exact scene and action."],
  ].map(([name, text]) => `<article class="support-option"><h3>${name}</h3><p>${text}</p><a href="mailto:${site.email}?subject=${encodeURIComponent(`${name} help`)}">Ask about ${name} →</a></article>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product help</p><h1>Help &amp; Support</h1><p class="lede">Start with the product guidance below, or prepare a structured ticket with the app, issue type, device details, exact steps, expected result, and actual result.</p></div></section>
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Quick help</p><h2>Start with the app</h2></div><p>These checks address common setup and test-build questions without exposing private operational information.</p></div><div class="support-grid">${quickHelp}</div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Ticket routing</p><h2>Choose the right request type</h2></div><p>The ticket form builds an email with the fields support needs to reproduce the issue or answer cleanly.</p></div><div class="ticket-type-grid">${issueCards}</div><form class="ticket-form" data-support-form data-email="${site.email}" data-privacy-email="${site.privacyEmail}"><div class="field"><label for="support-app">App</label><select id="support-app" name="app" data-support-select>${options}</select></div><div class="field"><label for="support-issue">Request type</label><select id="support-issue" name="issueType" data-support-issue>${issueOptions}</select></div><div class="field"><label for="support-severity">Severity</label><select id="support-severity" name="severity"><option>Question</option><option>Minor issue</option><option>Blocks testing</option><option>Crash or data loss</option></select></div><div class="field"><label for="support-device">Device and Android version</label><input id="support-device" name="device" type="text" maxlength="120" placeholder="Example: Samsung S22 Ultra, Android 16"></div><div class="field full"><label for="support-steps">Steps to reproduce or request details</label><textarea id="support-steps" name="steps" maxlength="1600" placeholder="What did you tap or try? What screen were you on?"></textarea></div><div class="field"><label for="support-expected">Expected result</label><textarea id="support-expected" name="expected" maxlength="700"></textarea></div><div class="field"><label for="support-actual">Actual result</label><textarea id="support-actual" name="actual" maxlength="700"></textarea></div><div class="consent-list full"><label><input type="checkbox" name="safeInfo" required><span>I will not include passwords, upload keys, signing material, payment data, or sensitive location history.</span></label></div><div class="form-actions"><button class="button" type="submit">Prepare support ticket email</button><a class="button secondary" data-support-link data-email="${site.email}" href="mailto:${site.email}">Quick email</a><p class="form-status" data-support-status aria-live="polite"></p></div><noscript><p>Email ${site.email} with the app, request type, device, Android version, steps, expected result, and actual result.</p></noscript></form></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Before contacting support</p><h2>Useful details</h2></div><p>Never email passwords, upload keys, private signing material, full payment information, or sensitive location history.</p></div><div class="faq-list">${faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div></section>`;
  return layout({ title: "Help & Support", description: "Get help and support for Maxxed Android apps and WordPress plugin workflows with app-specific ticket routing.", path: "support/", depth: 1, current: "support", body, schema: [faqSchema(faqs)] });
}

function privacyPage() {
  const policyLinks = apps.map((app) => `<li><a href="../apps/${app.slug}/privacy/">${escapeHtml(app.name)} privacy policy</a></li>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Company policy</p><h1>Website privacy</h1><p class="lede">TechMaxxed.com provides product information without website accounts or advertising trackers. Google Analytics is used to understand basic website traffic.</p><p class="fine-print">Effective June 23, 2026</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>This policy covers TechMaxxed.com. Every active app also has a detailed policy specific to its permissions and data behavior.</p><ul>${policyLinks}</ul></aside><article><h2>Website data</h2><p>The website uses Google Analytics to measure page views and basic traffic patterns. Google may process information such as page URL, browser and device details, approximate location derived from network information, referrer, timestamp, and related diagnostic signals under Google's terms. The website does not create visitor accounts or include advertising pixels. The hosting provider may also process standard request information such as IP address, browser type, requested page, timestamp, and security events to deliver and protect the site.</p><h2>Email and beta applications</h2><p>Support and beta forms open the visitor's email application. The website does not store the form contents. Emails sent to Maxxed Technical Systems may contain the applicant's email address, selected apps, device details, testing notes, and optional public credit name. This information is used to review the request, communicate about selected tests, maintain tester eligibility, and publish credit only when the tester expressly opts in.</p><h2>Beta retention and removal</h2><p>Beta application and participation records are retained while needed to manage testing, document consent, prevent abuse, and maintain credits. A tester may request removal from future contact, testing groups, or public credits by emailing <a href="mailto:${site.betaEmail}?subject=Beta%20removal%20request">${site.betaEmail}</a>.</p><h2>App privacy</h2><p>Each app policy explains on-device data, permissions, exports, deletion, third-party services, and any release-stage limitations. The final policy and Play Data safety declaration are reviewed against the signed build before public release.</p><h2>Children</h2><p>The website and beta program are not directed to children. Beta applicants must be at least 18 years old or have a parent or legal guardian apply and supervise participation.</p><h2>Changes</h2><p>This policy may be updated as products launch or website functionality changes. The effective date will be revised when material changes are published.</p><h2>Contact</h2><p>Privacy questions may be sent to <a href="mailto:${site.privacyEmail}?subject=Privacy%20question">${site.privacyEmail}</a>.</p></article></div></section>`;
  return layout({ title: "Privacy", description: "Read the Maxxed Technical Systems website privacy policy and learn how product support, local app data, and user-directed exports are handled.", path: "privacy/", depth: 1, body });
}

function appPrivacyPage(app) {
  const policy = privacyPolicies[app.slug];
  if (!policy) throw new Error(`Missing privacy policy for ${app.slug}`);
  const body = `<section class="band"><div class="shell section compact"><div class="product-kicker" style="--accent:${app.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">Privacy policy</span></div><p class="eyebrow">${escapeHtml(app.name)}</p><h1>${escapeHtml(app.name)} Privacy Policy</h1><p class="lede">${escapeHtml(policy.overview)}</p><p class="fine-print">Effective ${escapeHtml(policy.effectiveDate)}</p><div class="policy-summary" style="--accent:${app.accent}"><div><strong>Policy scope</strong><span>The current documented Android implementation and stated release configuration.</span></div><div><strong>User control</strong><span>Permissions remain controlled through Android settings and in-app actions.</span></div><div><strong>Contact</strong><span>${site.privacyEmail}</span></div></div></div></section><section class="shell section"><div class="copy-grid"><aside><p>This page is the public privacy-policy URL for ${escapeHtml(app.name)}. It must be reviewed against the final signed dependency and permission report before Play Store production release.</p><p><a href="../">Return to ${escapeHtml(app.name)}</a></p></aside><article><h2>Data processed</h2><ul class="policy-list">${policy.dataProcessed.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h2>Permissions and purpose</h2><table class="policy-table"><tbody>${policy.permissions.map(([permission, purpose]) => `<tr><th scope="row">${escapeHtml(permission)}</th><td>${escapeHtml(purpose)}</td></tr>`).join("")}</tbody></table><h2>Storage and security</h2><p>${escapeHtml(policy.storage)}</p><p>Maxxed Technical Systems applies reasonable safeguards appropriate to the current architecture, but no device or storage system can be guaranteed completely secure.</p><h2>Collection and sharing</h2><p>${escapeHtml(policy.sharing)}</p><h2>Retention</h2><p>${escapeHtml(policy.retention)}</p><h2>Deletion</h2><p>${escapeHtml(policy.deletion)}</p><h2>Third-party services</h2><p>${escapeHtml(policy.thirdParties)}</p><h2>Children</h2><p>${escapeHtml(policy.children)}</p><h2>Policy changes</h2><p>Material changes will be published on this page with a revised effective date. A production build will not deliberately enable a new remote data service without updating its disclosures.</p><h2>Contact</h2><p>Questions or deletion concerns may be sent to <a href="mailto:${site.privacyEmail}?subject=${encodeURIComponent(`${app.name} privacy question`)}">${site.privacyEmail}</a>.</p></article></div></section>`;
  return layout({ title: `${app.name} Privacy Policy`, description: `Read the detailed ${app.name} privacy policy, including permissions, local storage, sharing, retention, deletion, and third-party services.`, path: `apps/${app.slug}/privacy/`, depth: 3, current: "apps", body });
}

function betaPage() {
  const choices = betaApps.map(([slug, name, note]) => `<label class="check-option"><input type="checkbox" name="apps" value="${escapeHtml(name)}" data-app-slug="${slug}"><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(note)}</small></span></label>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Android first</p><h1>Become a beta tester</h1><p class="lede">We are always looking for people willing to test Maxxed apps on real Android devices and report what works, what breaks, and what feels confusing. You can request pre-release testing for apps that are still in development.</p><div class="proof-row"><span>Voluntary</span><span>Unpaid</span><span>Choose your apps</span><span>Pre-release requests welcome</span><span>Optional public credit</span></div></div></section><section class="shell section form-shell"><div class="notice" style="--accent:var(--yellow)"><p><strong>Participation is not employment and is not compensated.</strong></p><p>Selected testers receive test access and feedback instructions. Pre-release requests help us decide which product to launch next, often letting us finish a focused launch pass and get tester feedback quickly. Testers who opt in may be recognized permanently on the beta tester credits page.</p></div><form class="form-grid" data-beta-form data-email="${site.betaEmail}"><div class="field"><label for="beta-email">Google Account email</label><input id="beta-email" name="email" type="email" autocomplete="email" required><small>Google Play testing requires a Google Account or Google Workspace account.</small></div><div class="field"><label for="credit-name">Public credit name</label><input id="credit-name" name="creditName" type="text" maxlength="60" autocomplete="nickname"><small>Optional. Leave blank if you do not want a displayed name.</small></div><div class="field"><label for="device">Android device</label><input id="device" name="device" type="text" maxlength="80" placeholder="Example: Samsung Galaxy S22 Ultra" required></div><div class="field"><label for="android-version">Android version</label><input id="android-version" name="androidVersion" type="text" maxlength="30" placeholder="Example: Android 16" required></div><fieldset class="fieldset"><legend>Which apps would you like to test?</legend><div class="check-grid">${choices}</div></fieldset><div class="field full"><label for="beta-notes">Testing experience or notes</label><textarea id="beta-notes" name="notes" maxlength="1000" placeholder="Tell us what you like testing, accessibility needs, television model, outdoor use, pre-release interest, or other relevant details."></textarea></div><div class="consent-list"><label><input type="checkbox" name="ageConfirmation" required><span>I am at least 18 years old, or my parent or legal guardian is applying and will supervise participation.</span></label><label><input type="checkbox" name="compensation" required><span>I understand beta testing is voluntary and unpaid.</span></label><label><input type="checkbox" name="contactConsent" required><span>I agree to receive email about the apps I selected, test access, updates, and feedback requests.</span></label><label><input type="checkbox" name="creditConsent"><span>I give permission to display my public credit name on the beta tester credits page. I may withdraw this permission later.</span></label></div><div class="form-actions"><button class="button" type="submit">Prepare beta application email</button><p class="form-status" data-beta-status aria-live="polite"></p></div><noscript><p>Email ${site.betaEmail} with the apps, Android device, Android version, and whether you want public credit.</p></noscript></form></section><section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">How it works</p><h2>Application, approval, access</h2></div><p>Applications are reviewed before test access is granted. Being added to an interest list does not guarantee immediate selection.</p></div><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>1. Choose apps</h3><p>Select only the products you genuinely want to test on Android, including apps still in development.</p></article><article class="truth-item"><h3>2. Prioritize and prepare</h3><p>If a pre-release request is useful, we can prioritize that app, finish the launch pass, and prepare a tester build when feasible.</p></article><article class="truth-item"><h3>3. Test and report</h3><p>Install through Google Play or the provided test route, follow the checklist, and submit clear feedback.</p></article></div></div></section>`;
  return layout({ title: "Become a Beta Tester", description: "Apply to beta test Maxxed Android apps, select the products you want to test, and optionally receive public beta tester credit.", path: "beta/", depth: 1, current: "beta", body });
}

function betaCreditsPage() {
  const groups = betaCredits.map((group) => `<section class="credit-group"><h2>${escapeHtml(group.group)}</h2>${group.names.length ? `<ul>${group.names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : '<p class="credit-empty">Credits will appear here after participating testers explicitly approve public recognition.</p>'}</section>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Community recognition</p><h1>Beta tester credits</h1><p class="lede">The people who test early builds help turn functional software into dependable products. Public names appear only with the tester's permission.</p></div></section><section class="shell section"><div class="credit-grid">${groups}</div></section><section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">Credit policy</p><h2>Your name, your choice</h2></aside><article><p>Beta participation is voluntary and unpaid. Public credit is recognition, not compensation, employment, ownership, endorsement, or a promise of future benefits.</p><p>Testers choose the public name they want displayed and can request correction or removal at any time by emailing <a href="mailto:${site.betaEmail}?subject=Beta%20credit%20change">${site.betaEmail}</a>.</p><p><a class="button" href="../beta/">Apply to beta test</a></p></article></div></div></section>`;
  return layout({ title: "Beta Tester Credits", description: "Recognizing approved Maxxed Android beta testers who helped improve early product builds.", path: "beta-credits/", depth: 1, current: "beta", body });
}

function termsPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Website terms</p><h1>Terms of Use</h1><p class="lede">These terms govern use of TechMaxxed.com, its public product information, support links, beta applications, and tester credits.</p><p class="fine-print">Effective June 23, 2026</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>App-specific end-user terms may be provided with a released app. These website terms do not replace Play Store terms or a product-specific agreement.</p></aside><article><h2>Informational website</h2><p>Product descriptions, statuses, roadmaps, screenshots, and timelines are informational and may change. A testing or development label is not a promise of release or availability.</p><h2>Acceptable use</h2><p>Do not attempt to disrupt the website, bypass access controls, submit malicious content, impersonate another person, abuse support channels, or use the site in violation of law.</p><h2>Beta participation</h2><p>Beta testing is voluntary and unpaid. Selection is discretionary. Test builds may be incomplete, unstable, or removed without notice. Testers must follow applicable feedback and confidentiality instructions and must not submit another person's personal information.</p><h2>Beta credits</h2><p>Public credit is optional recognition only. It does not create employment, compensation, ownership, partnership, endorsement, or rights in a product. A tester may request correction or removal of their credit.</p><h2>No professional or guaranteed results</h2><p>Measurement, navigation, fishing, and visual-estimation products have documented limitations. They are not substitutes for laboratory analysis, legal fishing regulations, surveyed measurements, emergency navigation equipment, or professional advice.</p><h2>Intellectual property</h2><p>Website content, product names, artwork, and software are owned by Maxxed Technical Systems or used under applicable licenses. Limited personal viewing does not transfer ownership or grant redistribution rights.</p><h2>Third-party services</h2><p>Google Play, device manufacturers, television manufacturers, email providers, and user-selected export destinations operate under their own terms and privacy practices.</p><h2>Disclaimer and liability</h2><p>The website is provided on an as-available basis. To the extent permitted by law, Maxxed Technical Systems disclaims implied warranties and is not responsible for losses caused by reliance on development-stage information, unsupported devices, third-party services, or misuse of an app.</p><h2>Changes and contact</h2><p>These terms may be revised with a new effective date. Questions may be sent to <a href="mailto:${site.email}?subject=Website%20terms">${site.email}</a>.</p></article></div></section>`;
  return layout({ title: "Terms of Use", description: "Read the TechMaxxed.com website, beta participation, tester credit, acceptable use, and product-information terms.", path: "terms/", depth: 1, body });
}

function accessibilityPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Website access</p><h1>Accessibility</h1><p class="lede">Maxxed Technical Systems aims to make this product catalog understandable and usable across common devices, browsers, keyboards, and assistive technologies.</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>Accessibility is treated as ongoing product work rather than a one-time claim.</p></aside><article><h2>Current measures</h2><ul><li>Semantic headings, navigation landmarks, lists, buttons, and links.</li><li>A skip link and visible keyboard focus indicators.</li><li>Responsive layouts that reflow without relying on viewport-scaled type.</li><li>Labels for search and support controls.</li><li>Alternative text for meaningful product imagery.</li><li>Reduced-motion support for people who request it.</li><li>No essential interaction that depends only on color.</li></ul><h2>Known limitations</h2><p>Some visual product previews use abbreviated app marks and status labels. Public app screenshots may change as products finish testing.</p><h2>Feedback</h2><p>If a page, control, or document is difficult to use, email <a href="mailto:${site.email}?subject=Accessibility%20feedback">${site.email}</a> with the page address, the problem, and any assistive technology involved.</p></article></div></section>`;
  return layout({ title: "Accessibility", description: "Review the accessibility approach and feedback process for the Maxxed Technical Systems website.", path: "accessibility/", depth: 1, body });
}

function notFoundPage() {
  const body = `<section class="shell not-found"><div><strong>404</strong><h1>Page not found</h1><p class="lede">The address may have changed, or the app page may not exist yet.</p><div class="hero-actions"><a class="button" href="/">Return home</a><a class="button secondary" href="/apps/">Browse apps</a></div></div></section>`;
  return layout({ title: "Page not found", description: "The requested Maxxed Technical Systems page could not be found.", body, noIndex: true, forceRootLinks: true });
}

async function writePage(path, contents) {
  const destination = resolve(output, path);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

async function writeAdminExport(path, contents) {
  const destination = resolve(adminOutput, path);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

function adminSubdomainHtml(html, depth) {
  let transformed = html
    .replaceAll("https://techmaxxed.com/admin/plugins/", "https://admin.techmaxxed.com/plugins/")
    .replaceAll("https://techmaxxed.com/admin/", "https://admin.techmaxxed.com/");

  if (depth === 0) {
    transformed = transformed
      .replaceAll('href="../assets/', 'href="assets/')
      .replaceAll('src="../assets/', 'src="assets/')
      .replaceAll('href="../site.webmanifest"', 'href="site.webmanifest"')
      .replaceAll('href="../"', 'href="https://techmaxxed.com/"')
      .replaceAll('href="../apps/', 'href="https://techmaxxed.com/apps/')
      .replaceAll('href="../plugins/"', 'href="plugins/"')
      .replaceAll('href="../beta/', 'href="https://techmaxxed.com/beta/')
      .replaceAll('href="../beta-credits/', 'href="https://techmaxxed.com/beta-credits/')
      .replaceAll('href="../roadmap/', 'href="https://techmaxxed.com/roadmap/')
      .replaceAll('href="../admin/"', 'href="/"')
      .replaceAll('href="../about/', 'href="https://techmaxxed.com/about/')
      .replaceAll('href="../support/', 'href="https://techmaxxed.com/support/')
      .replaceAll('href="../privacy/', 'href="https://techmaxxed.com/privacy/')
      .replaceAll('href="../terms/', 'href="https://techmaxxed.com/terms/')
      .replaceAll('href="../accessibility/', 'href="https://techmaxxed.com/accessibility/');
  } else {
    transformed = transformed
      .replaceAll('href="../../assets/', 'href="../assets/')
      .replaceAll('src="../../assets/', 'src="../assets/')
      .replaceAll('href="../../site.webmanifest"', 'href="../site.webmanifest"')
      .replaceAll('href="../../"', 'href="https://techmaxxed.com/"')
      .replaceAll('href="../../apps/', 'href="https://techmaxxed.com/apps/')
      .replaceAll('href="../../plugins/"', 'href="/plugins/"')
      .replaceAll('href="../../beta/', 'href="https://techmaxxed.com/beta/')
      .replaceAll('href="../../beta-credits/', 'href="https://techmaxxed.com/beta-credits/')
      .replaceAll('href="../../roadmap/', 'href="https://techmaxxed.com/roadmap/')
      .replaceAll('href="../../admin/"', 'href="/"')
      .replaceAll('href="../../about/', 'href="https://techmaxxed.com/about/')
      .replaceAll('href="../../support/', 'href="https://techmaxxed.com/support/')
      .replaceAll('href="../../privacy/', 'href="https://techmaxxed.com/privacy/')
      .replaceAll('href="../../terms/', 'href="https://techmaxxed.com/terms/')
      .replaceAll('href="../../accessibility/', 'href="https://techmaxxed.com/accessibility/');
  }

  return transformed;
}

async function adminTestingFunctionsHtml() {
  const response = await adminPlatform.fetch(
    new Request("https://admin.techmaxxed.com/admin/testing-functions/", {
      headers: { "oai-authenticated-user-email": "admin@techmaxxed.com" },
    }),
    { ADMIN_ALLOWED_EMAILS: "admin@techmaxxed.com" },
  );
  if (!response.ok) throw new Error(`Admin platform export failed with ${response.status}`);
  return (await response.text())
    .replace(
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://admin.techmaxxed.com/">',
    )
    .replaceAll("admin@techmaxxed.com", "Static Hostinger export")
    .replaceAll('href="/admin/testing-functions/"', 'href="/"')
    .replaceAll("Testing Functions | Maxxed Admin", "Maxxed Admin")
    .replace(
      "async function api(path,options){const response=await fetch(path,options),body=response.status===204?{}:await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body}",
      "async function api(path,options){if(!window.ADMIN_API_ENABLED){if(path==='/api/test-artifacts')return {artifacts:[]};if(path==='/api/test-jobs')return {jobs:[]};throw new Error('Admin backend API is not mounted on this static Hostinger export. Deploy the Worker admin platform for uploads and runner jobs.')}const response=await fetch(path,options),body=response.status===204?{}:await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body}",
    )
    .replace(
      "<main><p class=\"eyebrow\">QA operations</p>",
      "<main><p class=\"eyebrow\">QA operations</p><div class=\"empty\" style=\"margin-bottom:16px\">Static export loaded from /public_html/admin. The full UI is present; APK uploads, runner jobs, artifacts, and evidence require the Worker admin backend.</div>",
    );
}

await rm(output, { recursive: true, force: true });
await rm(adminOutput, { recursive: true, force: true });
await rm(dist, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });

await writePage("index.html", homePage());
await writePage("apps/index.html", appsPage());
await writePage("plugins/index.html", pluginsPage());
await writePage("android-utility-apps/index.html", androidUtilityAppsPage());
await writePage("wordpress-cleanup-plugins/index.html", wordpressCleanupPluginsPage());
await writePage("camera-measurement-apps/index.html", cameraMeasurementAppsPage());
await writePage("compass-outdoor-tools/index.html", compassOutdoorToolsPage());
await writePage("beta-testing-android-apps/index.html", betaTestingLandingPage());
for (const app of apps) {
  await writePage(`apps/${app.slug}/index.html`, productPage(app));
  await writePage(`apps/${app.slug}/readme/index.html`, appReadmePage(app));
  await writePage(`apps/${app.slug}/privacy/index.html`, appPrivacyPage(app));
}
for (const plugin of wordpressPlugins) {
  await writePage(`plugins/${plugin.slug}/index.html`, pluginPage(plugin));
  await writePage(`plugins/${plugin.slug}/readme/index.html`, pluginReadmePage(plugin));
}
for (const product of repoProducts) {
  await writePage(`tools/${product.slug}/index.html`, toolPage(product, "Focused web tool"));
}
for (const product of powerhouseProducts) {
  await writePage(`tools/${product.slug}/index.html`, toolPage(product, "Business tool"));
}
await writePage("roadmap/index.html", roadmapPage());
await writePage("about/index.html", aboutPage());
await writePage("support/index.html", supportPage());
await writePage("privacy/index.html", privacyPage());
await writePage("accessibility/index.html", accessibilityPage());
await writePage("beta/index.html", betaPage());
await writePage("beta-credits/index.html", betaCreditsPage());
await writePage("terms/index.html", termsPage());
await writePage("404.html", notFoundPage());

const indexedPaths = [
  "",
  "apps/",
  "plugins/",
  "android-utility-apps/",
  "wordpress-cleanup-plugins/",
  "camera-measurement-apps/",
  "compass-outdoor-tools/",
  "beta-testing-android-apps/",
  ...apps.flatMap((app) => [`apps/${app.slug}/`, `apps/${app.slug}/readme/`, `apps/${app.slug}/privacy/`]),
  ...wordpressPlugins.flatMap((plugin) => [`plugins/${plugin.slug}/`, `plugins/${plugin.slug}/readme/`]),
  ...repoProducts.map((product) => `tools/${product.slug}/`),
  ...powerhouseProducts.map((product) => `tools/${product.slug}/`),
  "roadmap/",
  "about/",
  "support/",
  "privacy/",
  "accessibility/",
  "beta/",
  "beta-credits/",
  "terms/",
];
await writePage("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedPaths.map((path) => `  <url><loc>${canonical(path)}</loc></url>`).join("\n")}\n</urlset>\n`);
await writePage("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${canonical("sitemap.xml")}\n`);
await writePage("site.webmanifest", JSON.stringify({ name: site.name, short_name: site.shortName, start_url: "/", display: "standalone", background_color: "#07131f", theme_color: "#07131f", icons: [{ src: "/assets/images/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
await writePage("_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${contentSecurityPolicy}\n`);

await mkdir(adminOutput, { recursive: true });
await cp(resolve(root, "public", "assets"), resolve(adminOutput, "assets"), { recursive: true });
const testingFunctionsHtml = await adminTestingFunctionsHtml();
await writeAdminExport("index.html", testingFunctionsHtml);
await writeAdminExport("testing-functions/index.html", testingFunctionsHtml);
await writeAdminExport("data/product-registry.json", JSON.stringify({ version: 2, updatedAt: "2026-07-01", products: adminCatalogRecords() }, null, 2));
await writeAdminExport("products/index.html", adminProductsPage());
await writeAdminExport("products/aspiration/index.html", adminAspirationPage());
await writeAdminExport("plugins/index.html", adminPluginsPage());
await writeAdminExport("site.webmanifest", JSON.stringify({ name: "Maxxed Admin", short_name: "Maxxed Admin", start_url: "/", display: "standalone", background_color: "#07131f", theme_color: "#07131f", icons: [{ src: "/assets/images/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
await writeAdminExport("robots.txt", "User-agent: *\nDisallow: /\n");
await writeAdminExport("_headers", `/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${contentSecurityPolicy}\n`);

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

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const assets = {};
for (const file of await filesUnder(output)) {
  const path = `/${relative(output, file).split(sep).join("/")}`;
  assets[path] = { type: mime[extname(file)] || "application/octet-stream", data: (await readFile(file)).toString("base64") };
}

const workerSource = `const assets=${JSON.stringify(assets)};
const decode=(value)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
const security={"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":${JSON.stringify(contentSecurityPolicy)}};
export default {async fetch(request){const url=new URL(request.url);let path=decodeURIComponent(url.pathname);if(path==="/")path="/index.html";else if(path.endsWith("/"))path+="index.html";else if(!path.split("/").at(-1).includes(".")&&assets[path+"/index.html"]){return Response.redirect(url.origin+path+"/"+url.search,308);}const asset=assets[path];if(!asset){const missing=assets["/404.html"];return new Response(decode(missing.data),{status:404,headers:{"content-type":missing.type,...security}});}return new Response(decode(asset.data),{headers:{"content-type":asset.type,...security}});}};\n`;

await mkdir(resolve(root, "worker"), { recursive: true });
await writeFile(generatedWorker, workerSource, "utf8");
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await cp(output, resolve(dist, "client"), { recursive: true });
await cp(generatedWorker, resolve(dist, "server/index.js"));
await cp(resolve(root, ".openai/hosting.json"), resolve(dist, ".openai/hosting.json"));

console.log(`Built ${indexedPaths.length} indexed pages plus 404, SEO files, static assets, and Worker artifact.`);
