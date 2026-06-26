import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { apps, roadmap, site } from "../content/site-data.mjs";
import { betaApps, betaCredits } from "../content/beta-data.mjs";
import { privacyPolicies } from "../content/privacy-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "site");
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

function header(depth, current, makeLink = link) {
  const nav = [
    ["apps", "Apps", "apps/"],
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
        ${nav.map(([key, label, path]) => `<a href="${makeLink(depth, path)}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        <a class="nav-button" href="${makeLink(depth, "support/")}">Get support</a>
      </nav>
    </div>
  </header>`;
}

function footer(depth, makeLink = link) {
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div><a class="brand" href="${makeLink(depth)}"><span class="brand-mark" aria-hidden="true">MTS</span><span>Maxxed Technical Systems</span></a><p>${escapeHtml(site.description)}</p></div>
      <div><h2>Products</h2><ul><li><a href="${makeLink(depth, "apps/")}">All apps</a></li><li><a href="${makeLink(depth, "apps/maxxed-remote/")}">Maxxed Remote</a></li><li><a href="${makeLink(depth, "apps/maxxed-compass/")}">Maxxed Compass</a></li><li><a href="${makeLink(depth, "apps/rival-rush/")}">Rival Rush</a></li></ul></div>
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
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Current focus</p><h2>Seven products, one release queue</h2></div><p>We are keeping the public lineup focused on the six active Android products and the next near-term product.</p></div><div class="road-list">${roadmap.slice(0, 4).map((item, index) => `<div class="road-item"><span class="number">0${index + 1}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div><div class="hero-actions"><a class="button secondary" href="roadmap/">View the full release queue</a></div></section>
  <section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Test with us</p><h2>Android beta testers wanted</h2></div><p>Choose the apps you want to test, help us find real-device issues, and opt into permanent recognition on the beta tester credits page.</p></div><div class="hero-actions"><a class="button" href="beta/">Apply to beta test</a><a class="button secondary" href="beta-credits/">View tester credits</a></div></div></section>
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
  const body = `<section class="band product-hero"><div class="shell product-hero-grid"><div><div class="product-kicker" style="--accent:${app.accent}"><span class="app-icon" aria-hidden="true">${escapeHtml(app.icon)}</span><span class="status">${escapeHtml(app.status)}</span></div><p class="eyebrow">${escapeHtml(app.category)} app</p><h1>${escapeHtml(app.name)}</h1><p class="lede">${escapeHtml(app.description)}</p><div class="fact-row">${app.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("")}</div><div class="hero-actions"><a class="button" href="../../beta/?app=${app.slug}">Join the beta list</a><a class="button secondary" href="privacy/">App privacy</a><a class="button secondary" href="../../support/?app=${encodeURIComponent(app.name)}">Support</a></div></div>${featureVisual}</div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Capabilities</p><h2>What ${escapeHtml(app.short)} does</h2></div><p>${escapeHtml(app.summary)}</p></div><div class="feature-list" style="--accent:${app.accent}">${app.features.map(([title, text], index) => `<article class="feature-item"><span class="feature-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div></section>
  ${screenshots}
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Product truth</p><h2>Status, privacy, and limits</h2></div><p>Clear expectations are part of the product, not an afterthought.</p></div><div class="truth-grid" style="--accent:${app.accent}"><article class="truth-item"><h3>Availability</h3><p>${escapeHtml(app.availability)}</p></article><article class="truth-item"><h3>Privacy</h3><p>${escapeHtml(app.privacy)} <a href="privacy/">Read the detailed ${escapeHtml(app.name)} privacy policy.</a></p></article><article class="truth-item"><h3>Important limitation</h3><p>${escapeHtml(app.limitation)}</p></article></div></section>
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
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Current product focus</p><h1>Seven-product release queue</h1><p class="lede">Our public focus stays intentionally narrow: six active Android products and one next product. Statuses describe current work, not availability promises.</p></div></section><section class="shell section"><div class="road-list">${roadmap.map((item, index) => `<div class="road-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[2])}</p></div><span class="kind">${escapeHtml(item[1])}</span></div>`).join("")}</div></section><section class="band"><div class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">How priorities move</p><h2>Finish before expanding</h2></aside><article><p>Current Android products receive functionality, physical testing, store materials, privacy review, and truthful readiness reports before additional concepts enter public development.</p><p>Future ideas remain private until they have a real implementation path and a place in the release queue.</p><p><a class="button" href="../beta/">Apply to beta test</a></p></article></div></div></section>${contactBand(1, "Questions about the current release queue?")}`;
  return layout({ title: "Roadmap", description: "Follow the seven-product Tech Maxxed release queue for six active Android apps and the next near-term product.", path: "roadmap/", depth: 1, current: "roadmap", body });
}

function aboutPage() {
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">The company</p><h1>About Maxxed Technical Systems</h1><p class="lede">A security-minded product studio building practical software with a bias toward clear workflows, honest claims, and useful outcomes.</p></div></section><section class="shell section"><div class="copy-grid"><aside><p>Maxxed Technical Systems develops Android apps, small business tools, field workflows, and focused software products.</p></aside><article><h2>Why these products exist</h2><p>Many everyday tools become crowded with accounts, subscriptions, unnecessary data collection, or features that obscure the job. Maxxed products start from the task itself and keep the interface centered on completing it.</p><h2>How products are evaluated</h2><p>A build is not treated as release-ready because it compiles. Camera workflows need known-object tests. Compass features need outdoor sensor tests. Television control needs real model compatibility checks. Estimates need visible limitations and conservative ranges.</p><h2>A consistent private foundation</h2><p>Our products share a privately maintained foundation for common quality, privacy, security, and release practices. We publish what users need to understand each product while keeping internal systems, credentials, and operational details private.</p><h2>What the name represents</h2><p>“Maxxed” means pushing a practical tool toward its most useful form while remaining direct about what software can and cannot prove.</p></article></div></section><section class="band"><div class="shell section compact"><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>Focused</h3><p>Each product should solve a recognizable job without burying it in unnecessary navigation.</p></article><article class="truth-item"><h3>Accountable</h3><p>Status, privacy behavior, and product limitations are written in plain language.</p></article><article class="truth-item"><h3>Security-minded</h3><p>Access is minimized, sensitive details stay private, and public claims remain limited to what users need.</p></article></div></div></section>${contactBand(1, "Questions about Maxxed Technical Systems?")}`;
  return layout({ title: "About", description: "Learn how Maxxed Technical Systems builds practical Android apps and software around focused workflows, honest product claims, and real-world testing.", path: "about/", depth: 1, current: "about", body });
}

function supportPage() {
  const options = apps.map((app) => `<option value="${escapeHtml(app.name)}">${escapeHtml(app.name)}</option>`).join("");
  const quickHelp = [
    ["Maxxed Remote", "Check that the phone and TV are on the same private network, then approve the pairing request on the television."],
    ["Maxxed Compass", "Move away from magnetic cases, chargers, vehicles, and steel structures before recalibrating the device."],
    ["Maxxed Measure", "Keep the known-size reference in the same plane as the subject and correct both measurement endpoints."],
    ["Maxxed Gold Estimator", "Use even lighting, a visible scale reference, and all requested angles. Results are visual estimates, not assays."],
    ["Fishing Maxxed", "Use a clear known-length reference and always confirm current regulations through an official source."],
    ["Rival Rush", "Confirm the tester Google Account is eligible, update through Google Play, and report the exact scene and action."],
  ].map(([name, text]) => `<article class="support-option"><h3>${name}</h3><p>${text}</p><a href="mailto:${site.email}?subject=${encodeURIComponent(`${name} help`)}">Ask about ${name} →</a></article>`).join("");
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Product help</p><h1>Help &amp; Support</h1><p class="lede">Start with the product guidance below, or send a report with the app version, device model, Android version, and exact steps.</p></div></section>
  <section class="shell section compact"><div class="section-head"><div><p class="eyebrow">Quick help</p><h2>Start with the app</h2></div><p>These checks address common setup and test-build questions without exposing private operational information.</p></div><div class="support-grid">${quickHelp}</div></section>
  <section class="band"><div class="shell section"><div class="support-grid"><article class="support-option"><h3>Email support</h3><p>Select a product to prepare a correctly labeled support email.</p><label for="support-app">App</label><select id="support-app" data-support-select>${options}</select><p><a data-support-link data-email="${site.email}" href="mailto:${site.email}">Start support email →</a></p></article><article class="support-option"><h3>Report a problem</h3><p>Include the steps taken, what you expected, what happened, and whether the issue repeats.</p><a href="mailto:${site.email}?subject=Bug%20report">Send a bug report →</a></article><article class="support-option"><h3>Privacy question</h3><p>Ask how a specific Maxxed product handles captures, location, device data, exports, or accounts.</p><a href="mailto:${site.privacyEmail}?subject=Privacy%20question">Ask a privacy question →</a></article></div></div></section>
  <section class="shell section"><div class="section-head"><div><p class="eyebrow">Before contacting support</p><h2>Useful details</h2></div><p>Never email passwords, upload keys, private signing material, full payment information, or sensitive location history.</p></div><div class="faq-list"><details><summary>What should a bug report include?</summary><p>App name and version, phone model, Android version, exact steps, expected result, actual result, and a screenshot when it does not expose sensitive information.</p></details><details><summary>Where are downloads and Play Store links?</summary><p>Links will appear on each product page only after that app reaches its verified public release state.</p></details><details><summary>Can support recover deleted local data?</summary><p>Usually not. Several Maxxed apps intentionally keep records on the device and do not maintain a cloud copy.</p></details><details><summary>How do I become a beta tester?</summary><p>Use the beta tester application to select the Android apps you want to test. Participation is voluntary and unpaid, with optional public credit.</p></details></div></section>`;
  return layout({ title: "Help & Support", description: "Get help and support for Maxxed Remote, Maxxed Compass, Maxxed Measure, Maxxed Gold Estimator, Fishing Maxxed, and Rival Rush.", path: "support/", depth: 1, current: "support", body });
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
  const body = `<section class="band"><div class="shell section compact"><p class="eyebrow">Android first</p><h1>Become a beta tester</h1><p class="lede">We are always looking for people willing to test Maxxed apps on real Android devices and report what works, what breaks, and what feels confusing.</p><div class="proof-row"><span>Voluntary</span><span>Unpaid</span><span>Choose your apps</span><span>Optional public credit</span></div></div></section><section class="shell section form-shell"><div class="notice" style="--accent:var(--yellow)"><p><strong>Participation is not employment and is not compensated.</strong></p><p>Selected testers receive test access and feedback instructions. Testers who opt in may be recognized permanently on the beta tester credits page.</p></div><form class="form-grid" data-beta-form data-email="${site.betaEmail}"><div class="field"><label for="beta-email">Google Account email</label><input id="beta-email" name="email" type="email" autocomplete="email" required><small>Google Play testing requires a Google Account or Google Workspace account.</small></div><div class="field"><label for="credit-name">Public credit name</label><input id="credit-name" name="creditName" type="text" maxlength="60" autocomplete="nickname"><small>Optional. Leave blank if you do not want a displayed name.</small></div><div class="field"><label for="device">Android device</label><input id="device" name="device" type="text" maxlength="80" placeholder="Example: Samsung Galaxy S22 Ultra" required></div><div class="field"><label for="android-version">Android version</label><input id="android-version" name="androidVersion" type="text" maxlength="30" placeholder="Example: Android 16" required></div><fieldset class="fieldset"><legend>Which apps would you like to test?</legend><div class="check-grid">${choices}</div></fieldset><div class="field full"><label for="beta-notes">Testing experience or notes</label><textarea id="beta-notes" name="notes" maxlength="1000" placeholder="Tell us what you like testing, accessibility needs, television model, outdoor use, or other relevant details."></textarea></div><div class="consent-list"><label><input type="checkbox" name="ageConfirmation" required><span>I am at least 18 years old, or my parent or legal guardian is applying and will supervise participation.</span></label><label><input type="checkbox" name="compensation" required><span>I understand beta testing is voluntary and unpaid.</span></label><label><input type="checkbox" name="contactConsent" required><span>I agree to receive email about the apps I selected, test access, updates, and feedback requests.</span></label><label><input type="checkbox" name="creditConsent"><span>I give permission to display my public credit name on the beta tester credits page. I may withdraw this permission later.</span></label></div><div class="form-actions"><button class="button" type="submit">Prepare beta application email</button><p class="form-status" data-beta-status aria-live="polite"></p></div><noscript><p>Email ${site.betaEmail} with the apps, Android device, Android version, and whether you want public credit.</p></noscript></form></section><section class="band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">How it works</p><h2>Application, approval, access</h2></div><p>Applications are reviewed before test access is granted. Being added to an interest list does not guarantee immediate selection.</p></div><div class="truth-grid" style="--accent:var(--lime)"><article class="truth-item"><h3>1. Choose apps</h3><p>Select only the products you genuinely want to test on Android.</p></article><article class="truth-item"><h3>2. Verify and approve</h3><p>We confirm eligibility and send the correct Google Play opt-in instructions.</p></article><article class="truth-item"><h3>3. Test and report</h3><p>Install through Google Play, follow the test checklist, and submit clear feedback.</p></article></div></div></section>`;
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

await rm(output, { recursive: true, force: true });
await rm(dist, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });

await writePage("index.html", homePage());
await writePage("apps/index.html", appsPage());
for (const app of apps) {
  await writePage(`apps/${app.slug}/index.html`, productPage(app));
  await writePage(`apps/${app.slug}/privacy/index.html`, appPrivacyPage(app));
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

const indexedPaths = ["", "apps/", ...apps.flatMap((app) => [`apps/${app.slug}/`, `apps/${app.slug}/privacy/`]), "roadmap/", "about/", "support/", "privacy/", "accessibility/", "beta/", "beta-credits/", "terms/"];
await writePage("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexedPaths.map((path) => `  <url><loc>${canonical(path)}</loc></url>`).join("\n")}\n</urlset>\n`);
await writePage("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${canonical("sitemap.xml")}\n`);
await writePage("site.webmanifest", JSON.stringify({ name: site.name, short_name: site.shortName, start_url: "/", display: "standalone", background_color: "#07131f", theme_color: "#07131f", icons: [{ src: "/assets/images/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
await writePage("_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${contentSecurityPolicy}\n`);

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
