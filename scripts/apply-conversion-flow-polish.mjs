import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { site } from "../content/site-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");

function insertBeforeMainEnd(html, marker, block) {
  if (html.includes(marker)) return html;
  return html.replace("</main>", `${block}</main>`);
}

function replaceMeta(html, title, description, path) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title} | ${site.name}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${site.url}/${path}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title} | ${site.name}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${site.url}/${path}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title} | ${site.name}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);
}

const pricingPath = resolve(siteRoot, "pricing/index.html");
let pricing = await readFile(pricingPath, "utf8");
pricing = replaceMeta(pricing, "Pricing & Ordering", "Choose the right Maxxed path: app checkout, plugin package, beta request, support route, or a custom software order.", "pricing/");
const pricingRouter = `<section class="shell section compact conversion-router"><div class="section-head"><div><p class="eyebrow">Choose your path</p><h2>Not every visitor should go to checkout.</h2></div><p>Route people by intent so buyers, testers, support requests, and custom-work leads do not fight for the same button.</p></div><div class="conversion-route-grid"><article><span class="status">Buy</span><h3>Ready-made product</h3><p>Use checkout when the product, package, or support path already fits.</p><a class="button secondary" href="../checkout/">Start checkout</a></article><article><span class="status">Build</span><h3>Custom software</h3><p>Use Custom Orders for apps, plugins, automations, dashboards, MVPs, and cleanup passes.</p><a class="button" href="../custom-orders/">Start custom order</a></article><article><span class="status">Test</span><h3>Pre-release access</h3><p>Use beta testing when you want to test a product in development before public launch.</p><a class="button secondary" href="../beta/">Request beta access</a></article><article><span class="status">Help</span><h3>Existing issue</h3><p>Use support when the main need is troubleshooting, setup guidance, or product questions.</p><a class="button secondary" href="../support/">Get support</a></article></div></section>`;
pricing = insertBeforeMainEnd(pricing, "Not every visitor should go to checkout.", pricingRouter);
await writeFile(pricingPath, pricing, "utf8");

const checkoutPath = resolve(siteRoot, "checkout/index.html");
let checkout = await readFile(checkoutPath, "utf8");
checkout = replaceMeta(checkout, "Checkout", "Start a Maxxed checkout, request an invoice, or route custom software work to the correct ordering path.", "checkout/");
const checkoutRouter = `<section class="band checkout-router"><div class="shell section compact"><div class="order-panel"><div><p class="eyebrow">Before checkout</p><h2>Make sure this is the right lane.</h2><p>Checkout is for defined products and packages. If you need a scoped app, plugin, dashboard, automation, or project cleanup, use Custom Orders first so the work can be reviewed and quoted correctly.</p></div><div class="hero-actions"><a class="button" href="../custom-orders/">Route to Custom Orders</a><a class="button secondary" href="mailto:${site.email}?subject=Checkout%20question">Ask a checkout question</a></div></div></div></section>`;
checkout = insertBeforeMainEnd(checkout, "Make sure this is the right lane.", checkoutRouter);
await writeFile(checkoutPath, checkout, "utf8");

const supportPath = resolve(siteRoot, "support/index.html");
let support = await readFile(supportPath, "utf8");
const supportRouter = `<section class="shell section compact conversion-router"><div class="order-panel"><div><p class="eyebrow">Revenue routing</p><h2>Support can become a scoped order when needed.</h2><p>If a request is really new functionality, a workflow build, a plugin customization, or a dashboard, route it to Custom Orders instead of treating it as ordinary support.</p></div><div class="hero-actions"><a class="button" href="../custom-orders/">Open Custom Orders</a><a class="button secondary" href="../pricing/">Compare pricing paths</a></div></div></section>`;
support = insertBeforeMainEnd(support, "Support can become a scoped order when needed.", supportRouter);
await writeFile(supportPath, support, "utf8");

const customOrdersPath = resolve(siteRoot, "custom-orders/index.html");
let customOrders = await readFile(customOrdersPath, "utf8");
const customOrderRouter = `<section class="band final-routing-band"><div class="shell section compact"><div class="section-head"><div><p class="eyebrow">Still deciding?</p><h2>Use the fastest correct path.</h2></div><p>Custom Orders are for scoped work. Existing product issues, beta requests, and checkout questions each have cleaner paths.</p></div><div class="mini-route-grid"><a href="../support/"><strong>Need help?</strong><span>Use support for existing product issues.</span></a><a href="../beta/"><strong>Want to test?</strong><span>Use beta for pre-release access.</span></a><a href="../checkout/"><strong>Ready to buy?</strong><span>Use checkout for defined products.</span></a></div></div></section>`;
customOrders = insertBeforeMainEnd(customOrders, "Use the fastest correct path.", customOrderRouter);
await writeFile(customOrdersPath, customOrders, "utf8");

let css = await readFile(cssPath, "utf8");
if (!css.includes("/* Conversion flow polish */")) {
  css += `

/* Conversion flow polish */
.conversion-router .section-head { align-items: end; }
.conversion-route-grid,
.mini-route-grid { display: grid; gap: 16px; }
.conversion-route-grid { grid-template-columns: repeat(4, 1fr); }
.conversion-route-grid article,
.mini-route-grid a {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  padding: 24px;
}
.conversion-route-grid article { display: flex; min-height: 280px; flex-direction: column; }
.conversion-route-grid h3 { margin: 18px 0 10px; font-size: 26px; }
.conversion-route-grid p,
.mini-route-grid span { color: var(--muted); }
.conversion-route-grid .button { margin-top: auto; }
.conversion-route-grid article:nth-child(2) { border-color: rgba(185, 237, 69, 0.44); background: linear-gradient(180deg, rgba(185, 237, 69, 0.1), var(--surface)); }
.mini-route-grid { grid-template-columns: repeat(3, 1fr); }
.mini-route-grid a { color: var(--text); text-decoration: none; transition: border-color 160ms ease, transform 160ms ease; }
.mini-route-grid a:hover { border-color: var(--accent); transform: translateY(-2px); }
.mini-route-grid strong,
.mini-route-grid span { display: block; }
.mini-route-grid span { margin-top: 8px; font-size: 14px; }
@media (max-width: 1080px) { .conversion-route-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .conversion-route-grid, .mini-route-grid { grid-template-columns: 1fr; } .conversion-route-grid article { min-height: auto; } }
`;
  await writeFile(cssPath, css, "utf8");
}
