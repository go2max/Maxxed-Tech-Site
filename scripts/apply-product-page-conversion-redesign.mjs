import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { powerhouseProducts, repoProducts } from "../content/repo-products.mjs";
import { apps, wordpressPlugins } from "../content/site-data.mjs";
import { escapeHtml, insertBeforeMainEnd, readText, writeText } from "./public-redesign-utils.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");

const appBySlug = new Map(apps.map((item) => [item.slug, item]));
const pluginBySlug = new Map(wordpressPlugins.map((item) => [item.slug, item]));
const toolBySlug = new Map([...repoProducts, ...powerhouseProducts].map((item) => [item.slug, item]));

function appPanel(app) {
  return `<section class="shell section compact product-conversion-panel"><div class="conversion-panel" style="--accent:${escapeHtml(app.accent)}"><div><p class="eyebrow">Next step</p><h2>Test, buy, or request related app work.</h2><p>${escapeHtml(app.name)} can route visitors toward beta access, pricing, support, or a custom version of the workflow.</p><div class="fact-row"><span>Android app</span><span>${escapeHtml(app.status)}</span><span>Beta route</span><span>Custom app work</span></div></div><div class="conversion-actions"><a class="button" href="../../beta/?app=${encodeURIComponent(app.slug)}">Request beta access</a><a class="button secondary" href="../../custom-orders/">Order related app work</a><a class="button secondary" href="../../pricing/">View pricing</a><a class="button secondary" href="../../support/?app=${encodeURIComponent(app.name)}">Get support</a></div></div></section>`;
}

function pluginPanel(plugin) {
  return `<section class="shell section compact product-conversion-panel"><div class="conversion-panel" style="--accent:${escapeHtml(plugin.accent)}"><div><p class="eyebrow">Next step</p><h2>Install, configure, or order plugin work.</h2><p>${escapeHtml(plugin.name)} should feel like a business workflow tool with setup, support, pricing, and custom-plugin paths visible.</p><div class="fact-row"><span>WordPress plugin</span><span>${escapeHtml(plugin.status)}</span><span>Setup support</span><span>Custom plugin work</span></div></div><div class="conversion-actions"><a class="button" href="../../custom-orders/">Order plugin work</a><a class="button secondary" href="../../pricing/">View pricing</a><a class="button secondary" href="../../support/?app=${encodeURIComponent(plugin.name)}">Get plugin support</a><a class="button secondary" href="readme/">Read README</a></div></div></section>`;
}

function toolPanel(tool) {
  return `<section class="shell section compact product-conversion-panel"><div class="conversion-panel" style="--accent:${escapeHtml(tool.accent)}"><div><p class="eyebrow">Next step</p><h2>Turn this concept into a scoped build.</h2><p>${escapeHtml(tool.name)} is positioned as a focused workflow idea that can be discussed, tested, or turned into a direct order.</p><div class="fact-row"><span>Focused tool</span><span>${escapeHtml(tool.status)}</span><span>Build request</span><span>Workflow scope</span></div></div><div class="conversion-actions"><a class="button" href="../../custom-orders/">Request this build</a><a class="button secondary" href="../../support/?app=${encodeURIComponent(tool.name)}&issue=Feature%20request">Discuss this tool</a><a class="button secondary" href="../../tools/">Browse tools</a></div></div></section>`;
}

async function patchProduct(path, panel) {
  const fullPath = resolve(siteRoot, path);
  const html = await readText(fullPath);
  await writeText(fullPath, insertBeforeMainEnd(html, "product-conversion-panel", panel));
}

for (const [slug, app] of appBySlug) {
  await patchProduct(`apps/${slug}/index.html`, appPanel(app));
}
for (const [slug, plugin] of pluginBySlug) {
  await patchProduct(`plugins/${slug}/index.html`, pluginPanel(plugin));
}
for (const [slug, tool] of toolBySlug) {
  await patchProduct(`tools/${slug}/index.html`, toolPanel(tool));
}

let css = await readText(cssPath);
if (!css.includes("/* Product conversion redesign */")) {
  css += `

/* Product conversion redesign */
.product-conversion-panel { padding-top: 0; }
.conversion-panel {
  padding: clamp(26px, 4vw, 42px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-left: 5px solid var(--accent, var(--lime));
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.42fr);
  gap: clamp(24px, 5vw, 54px);
  align-items: center;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent, var(--lime)) 14%, transparent), transparent 46%),
    var(--surface);
}
.conversion-panel p { max-width: 760px; color: var(--muted); }
.conversion-actions { display: grid; gap: 10px; }
.conversion-actions .button { width: 100%; }
@media (max-width: 860px) { .conversion-panel { grid-template-columns: 1fr; } }
`;
  await writeText(cssPath, css);
}
