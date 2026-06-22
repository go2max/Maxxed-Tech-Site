import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { apps, roadmap, site } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "site");
const dist = resolve(root, "dist");
const generatedWorker = resolve(root, "worker/index.js");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const link = (depth, path = "") => `${"../".repeat(depth)}${path}`;
const canonical = (path = "") => `${site.url}/${path}`;
const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

function appCard(app, depth, featured = false) {
  return `<a class="app-card${featured ? " featured" : ""}" data-app-card data-category="${app.categoryKey}" style="--accent:${app.accent}" href="${link(depth, `apps/${app.slug}/`)}">
    <div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div>
    <h3>${escapeHtml(app.name)}</h3>
    <p>${escapeHtml(app.summary)}</p>
    <span class="app-meta">View ${escapeHtml(app.short)} details →</span>
  </a>`;
}

function header(depth, current) {
  const nav = [
    ["apps", "Apps", "apps/"],
    ["roadmap", "Roadmap", "roadmap/"],
    ["about", "About", "about/"],
    ["support", "Support", "support/"],
  ];
  return `<header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="${link(depth)}" aria-label="Maxxed Technical Systems home"><span class="brand-mark" aria-hidden="true">MTS</span><span class="brand-name">Maxxed Technical Systems</span></a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation">☰</button>
      <nav class="nav-links" id="primary-nav" data-nav-links data-open="false" aria-label="Primary navigation">
        ${nav.map(([key, label, path]) => `<a href="${link(depth, path)}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        <a class="nav-button" href="${link(depth, "support/")}">Get support</a>
      </nav>
    </div>
  </header>`;
}

function footer(depth) {
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div><a class="brand" href="${link(depth)}"><span class="brand-mark" aria-hidden="true">MTS</span><span>Maxxed Technical Systems</span></a><p>${escapeHtml(site.description)}</p></div>
      <div><h2>Products</h2><ul><li><a href="${link(depth, "apps/")}">All apps</a></li><li><a href="${link(depth, "apps/maxxed-remote/")}">Maxxed Remote</a></li><li><a href="${link(depth, "apps/maxxed-compass/")}">Maxxed Compass</a></li><li><a href="${link(depth, "apps/rival-rush/")}">Rival Rush</a></li></ul></div>
      <div><h2>Company</h2><ul><li><a href="${link(depth, "about/")}">About</a></li><li><a href="${link(depth, "roadmap/")}">Roadmap</a></li><li><a href="${link(depth, "support/")}">Support</a></li></ul></div>
      <div><h2>Policies</h2><ul><li><a href="${link(depth, "privacy/")}">Privacy</a></li><li><a href="${link(depth, "accessibility/")}">Accessibility</a></li><li><a href="mailto:${site.email}">Email us</a></li></ul></div>
    </div>
    <div class="shell footer-bottom">© <span data-year></span> Maxxed Technical Systems. Product availability and compatibility vary by app.</div>
  </footer>`;
}

function layout({ title, description, path = "", depth = 0, current = "", body, schema = [], image = "assets/images/og-default.png", noIndex = false }) {
  const fullTitle = title === site.name ? `${site.name} | Android Apps and Practical Software` : `${title} | ${site.name}`;
  const pageUrl = canonical(path);
  const imageUrl = canonical(image);
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
  <link rel="icon" href="${link(depth, "assets/images/favicon.svg")}" type="image/svg+xml">
  <link rel="manifest" href="${link(depth, "site.webmanifest")}">
  <link rel="stylesheet" href="${link(depth, "assets/site.css")}">
  ${schemas.map((item) => `<script type="application/ld+json">${jsonLd(item)}</script>`).join("\n  ")}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(depth, current)}
  <main id="main">${body}</main>
  ${footer(depth)}
  <script src="${link(depth, "assets/site.js")}" defer></script>
</body>
</html>`;
}

function contactBand(depth, heading = "Questions, support, or a product idea?") {
  return `<section class="shell contact-band"><div><h2>${heading}</h2><p>Talk directly with Maxxed Technical Systems.</p></div><a class="button" href="${link(depth, "support/")}">Visit support</a></section>`;
}

function homePage() {
  const featured = apps.slice(0, 4);
  const body = `<section class="band home-hero">
    <div class="shell home-hero-grid">
      <div><p class="eyebrow">Android apps + practical software</p><h1>Maxxed Technical Systems</h1><p class="lede">Useful tools built to do the job, from controlling a television and finding true north to recording catches and competing on the same couch.</p><div class="hero-actions"><a class="button" href="apps/">Explore all apps</a><a class="button secondary" href="roadmap/">See what is next</a></div><div class="proof-row"><span>Privacy-aware</span><span>Honest limitations</span><span>Android-first</span><span>Real-device validation</span></div></div>
      <div class="hero-products" aria-label="Featured Maxxed apps"><div class="hero-shot"><img src="assets/images/remote-control.png" alt="Maxxed Remote Android app main control screen" width="1080" height="1920"></div><div class="hero-stack">${featured.map((app) => `<a class="mini-product" style="--accent:${app.accent}" href="apps/${app.slug}/"><span class="mini-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><strong>${escapeHtml(app.short)}</strong><small>${escapeHtml(app.category)}</small></a>`).join("")}</div></div>
    </div>
  </section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Product directory</p><h2>Built around real tasks</h2></div><p>Every product page states what the app does, what remains in testing, how data is handled, and where the limits are.</p></div><div class="app-grid">${apps.map((app, index) => appCard(app, 0, index < 2)).join("")}</div></section>
  <section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">How we build</p><h2>Truth before hype</h2></div><p>Useful software earns trust through clear claims, careful handling of private data, and physical testing where sensors, cameras, televisions, or field conditions matter.</p></div><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Clear release states</h3><p>In-development tools are never presented as publicly available products.</p></article><article class="truth-item"><h3>Privacy by design</h3><p>On-device processing and explicit exports are preferred wherever the workflow supports them.</p></article><article class="truth-item"><h3>Evidence-based results</h3><p>Measurements and estimates expose uncertainty and never pretend a visual result is laboratory truth.</p></article></div></div></section>
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Coming next</p><h2>A practical roadmap</h2></div><p>Business, field, marketplace, and connected-device tools are being prioritized after the first mobile releases.</p></div><div class="road-list">${roadmap.slice(0, 4).map((item, index) => `<div class="road-item"><span class="number">0${index + 1}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div><div class="hero-actions"><a class="button secondary" href="roadmap/">View the full roadmap</a></div></section>
  ${contactBand(0)}`;
  return layout({
    title: site.name,
    description: site.description,
    body,
    schema: [{ "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, potentialAction: { "@type": "SearchAction", target: `${site.url}/apps/?q={search_term_string}`, "query-input": "required name=search_term_string" } }],
  });
}

function appsPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product directory</p><h1>Android apps and software</h1><p class="lede">Browse released candidates, active test builds, and tools currently in development. Status labels reflect the latest verified project state.</p></div></section>
  <section class="shell section"><div class="catalog-tools"><label class="search-box"><span class="skip-link">Search apps</span><input type="search" data-app-search placeholder="Search by name or capability" autocomplete="off"></label><div class="filters" role="group" aria-label="Filter apps"><button class="filter" data-filter="all" aria-pressed="true">All</button><button class="filter" data-filter="utility" aria-pressed="false">Utilities</button><button class="filter" data-filter="outdoors" aria-pressed="false">Outdoors</button><button class="filter" data-filter="games" aria-pressed="false">Games</button></div></div><p class="fine-print" data-result-count aria-live="polite"></p><div class="app-grid" data-catalog>${apps.map((app) => appCard(app, 1)).join("")}</div><p class="empty-state" data-empty-state hidden>No apps match that search. Try a product name or a broader category.</p></section>${contactBand(1, "Need help choosing the right app?")}`;
  return layout({ title: "Apps", description: "Browse Maxxed Technical Systems Android apps for TV control, navigation, measurement, visual field estimates, fishing records, and party games.", path: "apps/", depth: 1, current: "apps", body });
}

function productPage(app) {
  const featureVisual = app.featureImage
    ? `<div class="feature-image"><img src="../../assets/images/${app.featureImage}" alt="${escapeHtml(app.name)} feature graphic" width="1024" height="500"></div>`
    : `<div class="product-visual" style="--accent:${app.accent}"><span class="product-visual-label">Product focus</span><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><strong>${escapeHtml(app.tagline)}</strong><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div></div>`;
  const screenshots = app.screenshots ? `<section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Interface</p><h2>See the app in action</h2></div><p>Current store-ready screens from the Android release candidate.</p></div><div class="screenshot-strip">${app.screenshots.map(([src, alt]) => `<figure><img src="../../assets/images/${src}" alt="${escapeHtml(alt)}" width="1080" height="1920" loading="lazy"><figcaption>${escapeHtml(alt)}</figcaption></figure>`).join("")}</div></div></section>` : "";
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${app.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><p class="eyebrow">${escapeHtml(app.category)} app</p><h1>${escapeHtml(app.name)}</h1><p class="lede">${escapeHtml(app.description)}</p><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../support/?app=${encodeURIComponent(app.name)}">Get app support</a><a class="button secondary" href="../">All apps</a></div></div>${featureVisual}</div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Capabilities</p><h2>What ${escapeHtml(app.short)} does</h2></div><p>${escapeHtml(app.summary)}</p></div><div class="feature-list" style="--accent:${app.accent}">${app.features.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
  ${screenshots}
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Product truth</p><h2>Status, privacy, and limits</h2></div><p>Clear expectations are part of the product, not an afterthought.</p></div><div class="truth-grid" style="--accent:${app.accent}"><article class="truth-item"><h3>Availability</h3><p>${escapeHtml(app.availability)}</p></article><article class="truth-item"><h3>Privacy</h3><p>${escapeHtml(app.privacy)}</p></article><article class="truth-item"><h3>Important limitation</h3><p>${escapeHtml(app.limitation)}</p></article></div></section>
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

function roadmapPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Planned products</p><h1>Product roadmap</h1><p class="lede">The roadmap captures prioritized concepts after the first mobile releases. These are planned products, not availability promises.</p></div></section><section class="shell section"><div class="road-list">${roadmap.map((item, index) => `<div class="road-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div></section><section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">How priorities move</p><h2>Release the foundation first</h2></aside><article><p>Current Android products receive functionality, device testing, store materials, and truthful readiness reports before planned concepts move into production.</p><p>Priority is based on launch speed, usefulness, revenue potential, implementation risk, and how well the product fits the broader Maxxed Technical Systems catalog.</p></article></div></div></section>${contactBand(1, "Have a use case that belongs on the roadmap?")}`;
  return layout({ title: "Roadmap", description: "Explore the planned Maxxed Technical Systems product roadmap for WordPress, field inspection, marketplaces, connected devices, analytics, and business profiles.", path: "roadmap/", depth: 1, current: "roadmap", body });
}

function aboutPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">The company</p><h1>About Maxxed Technical Systems</h1><p class="lede">A product studio building practical software with a bias toward clear workflows, honest claims, and useful outcomes.</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>Maxxed Technical Systems develops Android apps, small business tools, field workflows, and focused software products.</p></aside><article><h2>Why these products exist</h2><p>Many everyday tools become crowded with accounts, subscriptions, unnecessary data collection, or features that obscure the job. Maxxed products start from the task itself and keep the interface centered on completing it.</p><h2>How products are evaluated</h2><p>A build is not treated as release-ready because it compiles. Camera workflows need known-object tests. Compass features need outdoor sensor tests. Television control needs real model compatibility checks. Estimates need visible limitations and conservative ranges.</p><h2>What the name represents</h2><p>“Maxxed” means pushing a practical tool toward its most useful form while remaining direct about what software can and cannot prove.</p></article></div></section><section class="band"><div class="shell section compact"><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Focused</h3><p>Each product should solve a recognizable job without burying it in unnecessary navigation.</p></article><article class="truth-item"><h3>Accountable</h3><p>Status, privacy behavior, and product limitations are written in plain language.</p></article><article class="truth-item"><h3>Expandable</h3><p>A shared product catalog lets new apps join the same support, policy, and release framework.</p></article></div></div></section>${contactBand(1, "Build something useful with us in mind?")}`;
  return layout({ title: "About", description: "Learn how Maxxed Technical Systems builds practical Android apps and software around focused workflows, honest product claims, and real-world testing.", path: "about/", depth: 1, current: "about", body });
}

function supportPage() {
  const options = apps.map((app) => `<option value="${escapeHtml(app.name)}">${escapeHtml(app.name)}</option>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product help</p><h1>Support</h1><p class="lede">Choose an app, describe the issue, and include the device model and Android version when they matter.</p></div></section><section class="shell section"><div class="support-grid"><article class="support-option"><h3>Email support</h3><p>Select a product to prepare a correctly labeled support email.</p><label for="support-app">App</label><select id="support-app" data-support-select>${options}</select><p><a data-support-link href="mailto:${site.email}">Start support email →</a></p></article><article class="support-option"><h3>Report a problem</h3><p>Include the steps taken, what you expected, what happened, and whether the issue repeats.</p><a href="mailto:${site.email}?subject=Bug%20report">Send a bug report →</a></article><article class="support-option"><h3>Privacy question</h3><p>Ask how a specific Maxxed product handles captures, location, device data, exports, or accounts.</p><a href="mailto:${site.email}?subject=Privacy%20question">Ask a privacy question →</a></article></div></section><section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Before contacting support</p><h2>Useful details</h2></div><p>Never email passwords, upload keys, private signing material, full payment information, or sensitive location history.</p></div><div class="faq-list"><details><summary>What should a bug report include?</summary><p>App name and version, phone model, Android version, exact steps, expected result, actual result, and a screenshot when it does not expose sensitive information.</p></details><details><summary>Where are downloads and Play Store links?</summary><p>Links will appear on each product page only after that app reaches its verified public release state.</p></details><details><summary>Can support recover deleted local data?</summary><p>Usually not. Several Maxxed apps intentionally keep records on the device and do not maintain a cloud copy.</p></details><details><summary>How quickly will support reply?</summary><p>Response time depends on volume and the product’s release stage. Clear reproduction details help move technical issues faster.</p></details></div></div></section>`;
  return layout({ title: "Support", description: "Get support for Maxxed Remote, Maxxed Compass, Maxxed Measure, Maxxed Gold Estimator, Fishing Maxxed, and Rival Rush.", path: "support/", depth: 1, current: "support", body });
}

function privacyPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Company policy</p><h1>Privacy</h1><p class="lede">This website is designed to provide product information without accounts, advertising trackers, or analytics scripts.</p><p class="fine-print">Effective June 22, 2026</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>This website policy covers maxxedtechnicalsystems.com. Each released app will also publish disclosures specific to its permissions and data behavior.</p></aside><article><h2>Website data</h2><p>The static website does not include account registration, cookies, advertising pixels, analytics SDKs, or a server-side contact form. Your hosting provider may process standard request information such as IP address, browser type, requested page, and timestamp for delivery and security.</p><h2>Email</h2><p>If you contact support, the message and information you choose to provide are used to respond, diagnose an issue, maintain support records, and improve products. Do not send passwords, signing keys, payment-card data, or unnecessary sensitive information.</p><h2>App privacy</h2><p>App behavior varies. Maxxed Compass, Maxxed Gold Estimator, and Fishing Maxxed are designed around on-device or offline-first workflows. Maxxed Remote communicates with compatible televisions on the local network. Rival Rush’s final disclosure will reflect its final advertising configuration.</p><h2>Exports and sharing</h2><p>Some products let users explicitly export records or reports. Once a user selects a destination or shares a file, the receiving application or service controls that copy.</p><h2>Children</h2><p>The website is a general product catalog and is not designed to collect personal information from children.</p><h2>Changes</h2><p>This policy may be updated as products launch or website functionality changes. The effective date will be revised when material changes are published.</p><h2>Contact</h2><p>Privacy questions may be sent to <a href="mailto:${site.email}?subject=Privacy%20question">${site.email}</a>.</p></article></div></section>`;
  return layout({ title: "Privacy", description: "Read the Maxxed Technical Systems website privacy policy and learn how product support, local app data, and user-directed exports are handled.", path: "privacy/", depth: 1, body });
}

function accessibilityPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Website access</p><h1>Accessibility</h1><p class="lede">Maxxed Technical Systems aims to make this product catalog understandable and usable across common devices, browsers, keyboards, and assistive technologies.</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>Accessibility is treated as ongoing product work rather than a one-time claim.</p></aside><article><h2>Current measures</h2><ul><li>Semantic headings, navigation landmarks, lists, buttons, and links.</li><li>A skip link and visible keyboard focus indicators.</li><li>Responsive layouts that reflow without relying on viewport-scaled type.</li><li>Labels for search and support controls.</li><li>Alternative text for meaningful product imagery.</li><li>Reduced-motion support for people who request it.</li><li>No essential interaction that depends only on color.</li></ul><h2>Known limitations</h2><p>Some visual product previews use abbreviated app marks and status labels. Public app screenshots may change as products finish testing.</p><h2>Feedback</h2><p>If a page, control, or document is difficult to use, email <a href="mailto:${site.email}?subject=Accessibility%20feedback">${site.email}</a> with the page address, the problem, and any assistive technology involved.</p></article></div></section>`;
  return layout({ title: "Accessibility", description: "Review the accessibility approach and feedback process for the Maxxed Technical Systems website.", path: "accessibility/", depth: 1, body });
}

function notFoundPage() {
  const body = `<section class="shell not-found"><div><strong>404</strong><h1>Page not found</h1><p class="lede">The address may have changed, or the app page may not exist yet.</p><div class="hero-actions"><a class="button" href="./">Return home</a><a class="button secondary" href="apps/">Browse apps</a></div></div></section>`;
  return layout({ title: "Page not found", description: "The requested Maxxed Technical Systems page could not be found.", body, noIndex: true });
}

async function writePage(path, contents) {
  const destination = resolve(output, path);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

await rm(output, { recursive: true, force: true });
await rm(dist, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });

await writePage("index.html", homePage());
await writePage("apps/index.html", appsPage());
for (const app of apps) await writePage(`apps/${app.slug}/index.html`, productPage(app));
await writePage("roadmap/index.html", roadmapPage());
await writePage("about/index.html", aboutPage());
await writePage("support/index.html", supportPage());
await writePage("privacy/index.html", privacyPage());
await writePage("accessibility/index.html", accessibilityPage());
await writePage("404.html", notFoundPage());

const indexedPaths = ["", "apps/", ...apps.map((app) => `apps/${app.slug}/`), "roadmap/", "about/", "support/", "privacy/", "accessibility/"];
await writePage("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedPaths.map((path) => `  <url><loc>${canonical(path)}</loc></url>`).join("\n")}\n</urlset>\n`);
await writePage("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${canonical("sitemap.xml")}\n`);
await writePage("site.webmanifest", JSON.stringify({ name: site.name, short_name: site.shortName, start_url: "/", display: "standalone", background_color: "#07131f", theme_color: "#07131f", icons: [{ src: "/assets/images/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
await writePage("_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:\n`);

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
const security={"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:"};
export default {async fetch(request){const url=new URL(request.url);let path=decodeURIComponent(url.pathname);if(path==="/")path="/index.html";else if(path.endsWith("/"))path+="index.html";else if(!path.split("/").at(-1).includes(".")&&assets[path+"/index.html"]){return Response.redirect(url.origin+path+"/"+url.search,308);}const asset=assets[path];if(!asset){const missing=assets["/404.html"];return new Response(decode(missing.data),{status:404,headers:{"content-type":missing.type,...security}});}return new Response(decode(asset.data),{headers:{"content-type":asset.type,...security}});}};\n`;

await mkdir(resolve(root, "worker"), { recursive: true });
await writeFile(generatedWorker, workerSource, "utf8");
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await cp(output, resolve(dist, "client"), { recursive: true });
await cp(generatedWorker, resolve(dist, "server/index.js"));
await cp(resolve(root, ".openai/hosting.json"), resolve(dist, ".openai/hosting.json"));

console.log(`Built ${indexedPaths.length} indexed pages plus 404, SEO files, static assets, and Worker artifact.`);
