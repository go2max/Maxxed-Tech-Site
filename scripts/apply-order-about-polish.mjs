import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { site } from "../content/site-data.mjs";
import { insertBeforeMainEnd, readText, replaceMain, replaceMeta, writeText } from "./public-redesign-utils.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");

const orderEmail = `mailto:${site.email}?subject=Custom%20software%20order%20request&body=Project%20type%3A%0APlatform%20needed%3A%0AWorkflow%20or%20problem%3A%0AWho%20will%20use%20it%3A%0AMust-have%20first%20version%3A%0ANice-to-have%20later%3A%0ADeadline%20or%20urgency%3A%0ABudget%20range%20if%20known%3A%0ALinks%20or%20examples%3A%0A`;

const aboutBody = `<section class="band section-hero"><div class="shell section compact"><p class="eyebrow">Maxxed Technical Systems</p><h1>Independent software built by Max Uland.</h1><p class="lede">Maxxed Technical Systems is a practical software studio focused on Android apps, WordPress tools, workflow utilities, and custom builds that solve specific real-world jobs.</p><div class="proof-row"><span>Apps</span><span>Plugins</span><span>Custom software</span><span>Direct builder contact</span></div><div class="hero-actions"><a class="button" href="../custom-orders/">Order custom work</a><a class="button secondary" href="../apps/">Explore apps</a><a class="button secondary" href="mailto:${site.email}">Email Maxxed</a></div></div></section>
<section class="shell section"><div class="copy-grid founder-copy"><aside><p class="eyebrow">Builder-led</p><h2>Built for useful outcomes, not bloated software.</h2><p>Keeping Max Uland visible gives customers a real person behind the product brand while preserving Maxxed Technical Systems as the company umbrella.</p></aside><article><h2>What Maxxed builds</h2><p>Maxxed Technical Systems builds mobile-first apps, WordPress workflow tools, lightweight web utilities, and custom software for businesses or individuals who need a focused tool instead of a giant platform.</p><h2>How the work is evaluated</h2><p>Products are judged by whether they complete the job clearly. TV control needs real device testing. Compass and field tools need sensor and outdoor checks. Camera-assisted measurement needs known references and visible limitations. Website tools need review-first workflows and safe support routing.</p><h2>Where custom work fits</h2><p>Custom work is reviewed directly by Max Uland to determine scope, feasibility, and the best first version. The ideal project has a clear workflow, a defined user, and a useful first release that can be built without pretending to be enterprise software on day one.</p></article></div></section>
<section class="band"><div class="shell section compact"><div class="trust-strip"><article><strong>Clear release states</strong><span>Development, beta, early access, and orderable work stay labeled.</span></article><article><strong>Privacy-conscious defaults</strong><span>Local-first and explicit export paths are preferred where possible.</span></article><article><strong>Practical support</strong><span>Support requests collect the details needed to reproduce and resolve issues.</span></article></div></div></section>
<section class="shell contact-band"><div><h2>Have a project that fits?</h2><p>Request a scoped app, plugin, automation, dashboard, or cleanup pass.</p></div><a class="button" href="../custom-orders/">Start an Order</a></section>`;

const orderBody = `<section class="band product-hero presence-hero"><div class="shell product-hero-grid"><div><p class="eyebrow">Direct ordering</p><h1>Order a custom app, plugin, automation, or workflow tool.</h1><p class="lede">Use this path when you need a focused product, internal workflow, small business tool, site utility, or existing project cleanup handled by a builder who can scope the first usable version.</p><div class="hero-actions"><a class="button" href="${orderEmail}">Start order email</a><a class="button secondary" href="../pricing/">View pricing</a><a class="button secondary" href="mailto:${site.email}?subject=Question%20before%20custom%20order">Ask before ordering</a></div></div><div class="product-visual custom-order-visual" style="--accent:var(--lime)"><span class="product-visual-label">Reviewed directly</span><strong>Max Uland reviews custom requests for scope, feasibility, and the fastest useful build path.</strong><div class="fact-row"><span>Apps</span><span>Plugins</span><span>Automations</span><span>MVPs</span></div></div></div></section>
<section class="shell section"><div class="section-head"><div><p class="eyebrow">Order types</p><h2>What can be built</h2></div><p>Direct orders work best when the first version is narrow, useful, and testable.</p></div><div class="order-type-grid"><article class="order-type-card"><span class="status">Mobile</span><h3>Android apps</h3><p>Utilities, field tools, prototypes, and productized app workflows.</p></article><article class="order-type-card"><span class="status">WordPress</span><h3>Plugins</h3><p>Review-first admin tools, maintenance workflows, content operations, and customer portals.</p></article><article class="order-type-card"><span class="status">Web</span><h3>Dashboards & tools</h3><p>Focused forms, calculators, tracking screens, support flows, and internal utilities.</p></article><article class="order-type-card"><span class="status">Cleanup</span><h3>Existing projects</h3><p>Code cleanup, launch hardening, page rebuilds, workflow fixes, and MVP rescue passes.</p></article></div></section>
<section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Scope quality</p><h2>What to include in the request</h2></div><p>The cleaner the request, the faster it can be quoted, routed, or turned into a first version.</p></div><div class="request-grid"><article><strong>Problem</strong><span>What is broken, slow, repetitive, confusing, or missing?</span></article><article><strong>User</strong><span>Who will use the tool and how often?</span></article><article><strong>Platform</strong><span>Android, WordPress, web, Chrome extension, desktop, or unsure?</span></article><article><strong>First version</strong><span>What must exist in version one for it to be useful?</span></article><article><strong>Examples</strong><span>Links, screenshots, current tools, spreadsheets, or competitor references.</span></article><article><strong>Constraints</strong><span>Deadline, budget range, privacy concerns, integrations, or launch pressure.</span></article></div></div></section>
<section class="shell section compact"><div class="copy-grid"><aside><p class="eyebrow">Good fit</p><h2>Best-fit projects</h2></aside><article><p>Good fits include small business tools, app prototypes, WordPress workflow plugins, admin dashboards, intake forms, lead capture flows, practical automations, calculators, launch pages, and cleanup of existing projects.</p><p>Poor fits include vague large-scale platforms, regulated systems without proper planning, unclear “build the next Uber” ideas, or projects that need a full team before the first usable version is defined.</p><p><a class="button" href="${orderEmail}">Start a custom order</a></p></article></div></section>`;

const pricingInsert = `<section class="band"><div class="shell section compact"><div class="order-panel"><div><p class="eyebrow">Custom work</p><h2>Need a quote instead of a listed product?</h2><p>Pricing pages cover product and checkout paths. Custom software, plugin work, dashboards, automations, and MVP cleanup should start through the direct-order page so scope can be reviewed first.</p></div><div class="hero-actions"><a class="button" href="../custom-orders/">Start custom order</a><a class="button secondary" href="mailto:${site.email}?subject=Pricing%20question">Ask pricing question</a></div></div></div></section>`;

const aboutPath = resolve(siteRoot, "about/index.html");
let aboutHtml = await readText(aboutPath);
aboutHtml = replaceMeta(replaceMain(aboutHtml, aboutBody), site, "About", "Learn about Maxxed Technical Systems, the practical software studio built by Max Uland for apps, plugins, tools, and custom software work.", "about/");
await writeText(aboutPath, aboutHtml);

const customOrdersPath = resolve(siteRoot, "custom-orders/index.html");
let orderHtml = await readText(customOrdersPath);
orderHtml = replaceMeta(replaceMain(orderHtml, orderBody), site, "Custom Orders", "Order custom app, plugin, automation, dashboard, MVP, web tool, or project cleanup work from Maxxed Technical Systems.", "custom-orders/");
await writeText(customOrdersPath, orderHtml);

const pricingPath = resolve(siteRoot, "pricing/index.html");
let pricingHtml = await readText(pricingPath);
if (!pricingHtml.includes("Need a quote instead of a listed product?")) {
  pricingHtml = insertBeforeMainEnd(pricingHtml, "Need a quote instead of a listed product?", pricingInsert);
  await writeText(pricingPath, pricingHtml);
}

let css = await readText(cssPath);
if (!css.includes("/* Order and about polish */")) {
  css += `

/* Order and about polish */
.founder-copy aside h2 { font-size: clamp(32px, 4vw, 52px); }
.trust-strip,
.request-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.trust-strip article,
.request-grid article {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}
.trust-strip strong,
.trust-strip span,
.request-grid strong,
.request-grid span { display: block; }
.trust-strip span,
.request-grid span { margin-top: 8px; color: var(--muted); font-size: 14px; }
.request-grid article:nth-child(1),
.request-grid article:nth-child(4) { border-color: rgba(185, 237, 69, 0.34); }
@media (max-width: 900px) { .trust-strip, .request-grid { grid-template-columns: 1fr; } }
`;
  await writeText(cssPath, css);
}
