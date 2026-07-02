import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { apps, site, wordpressPlugins } from "../content/site-data.mjs";
import { insertBeforeMainEnd, readText, replaceMain, replaceMeta, writeText } from "./public-redesign-utils.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");

const appOptions = apps.map((app) => `<option>${app.name}</option>`).join("");
const pluginOptions = wordpressPlugins.slice(0, 24).map((plugin) => `<option>${plugin.name}</option>`).join("");
const safeDetails = "Do not send passwords, card numbers, signing keys, private upload keys, sensitive location history, or customer secrets.";

const supportBody = `<section class="band section-hero"><div class="shell section compact"><p class="eyebrow">Support routing</p><h1>Get help, request testing, or ask about a build.</h1><p class="lede">Use the support path when you need app help, beta access, plugin setup guidance, privacy answers, or a quick direction check before ordering custom work.</p><div class="proof-row"><span>App support</span><span>Beta requests</span><span>Plugin guidance</span><span>Custom build questions</span></div><div class="hero-actions"><a class="button" href="mailto:${site.email}?subject=Support%20request">Email support</a><a class="button secondary" href="../custom-orders/">Start custom order</a><a class="button secondary" href="../beta/">Apply to beta test</a></div></div></section>
<section class="shell section compact"><div class="support-route-grid"><article class="support-route-card"><span class="status">Android</span><h2>App issue</h2><p>Use this for crashes, confusing screens, permissions, install problems, measurements, TV pairing, or field-tool behavior.</p><a class="button secondary" href="mailto:${site.email}?subject=Android%20app%20support&body=App%3A%0ADevice%20model%3A%0AAndroid%20version%3A%0AWhat%20happened%3A%0AExpected%20result%3A%0AActual%20result%3A%0A">Prepare app email</a></article><article class="support-route-card"><span class="status">Testing</span><h2>Beta access</h2><p>Request access for apps in beta or development. Useful tester requests help decide what gets finished next.</p><a class="button secondary" href="../beta/">Open beta form</a></article><article class="support-route-card"><span class="status">WordPress</span><h2>Plugin help</h2><p>Ask about setup, workflow fit, plugin behavior, package readiness, or which WordPress tool fits your site.</p><a class="button secondary" href="mailto:${site.email}?subject=WordPress%20plugin%20support&body=Plugin%3A%0AWordPress%20version%3A%0ATheme%3A%0AWorkflow%20needed%3A%0AIssue%20or%20question%3A%0A">Prepare plugin email</a></article><article class="support-route-card featured"><span class="status">Build</span><h2>Custom work</h2><p>Use this when the answer is not support but a new tool, app, dashboard, automation, or cleanup pass.</p><a class="button" href="../custom-orders/">Start order path</a></article></div></section>
<section class="band"><div class="shell section"><div class="section-head"><div><p class="eyebrow">Structured ticket</p><h2>Send the details that make the issue actionable</h2></div><p>${safeDetails}</p></div><form class="ticket-form support-polish-form" data-support-form data-email="${site.email}"><div class="field"><label for="support-product-polish">Product or route</label><select id="support-product-polish" name="app" data-support-select><option>General product guidance</option>${appOptions}${pluginOptions}<option>Custom software order</option><option>Pricing question</option></select></div><div class="field"><label for="support-issue-polish">Request type</label><select id="support-issue-polish" name="issueType" data-support-issue><option>Setup or install</option><option>Bug or crash</option><option>UX confusion</option><option>Privacy or data</option><option>Feature request</option><option>Pre-release testing</option><option>Custom order question</option></select></div><div class="field"><label for="support-device-polish">Device, browser, or platform</label><input id="support-device-polish" name="device" type="text" maxlength="140" placeholder="Example: Samsung S22 Ultra / WordPress 6.x / Chrome"></div><div class="field full"><label for="support-steps-polish">What happened or what do you need?</label><textarea id="support-steps-polish" name="steps" maxlength="1600" placeholder="Include the exact workflow, screen, product, expected result, and actual result."></textarea></div><div class="consent-list full"><label><input type="checkbox" name="safeInfo" required><span>${safeDetails}</span></label></div><div class="form-actions"><button class="button" type="submit">Prepare support email</button><a class="button secondary" href="mailto:${site.email}">Quick email</a><p class="form-status" data-support-status aria-live="polite"></p></div></form></div></section>
<section class="shell contact-band"><div><h2>Not sure if this is support or a custom build?</h2><p>Send the workflow and current blocker. If it needs a build, route it through Custom Orders.</p></div><a class="button" href="../custom-orders/">Custom Orders</a></section>`;

const betaInsert = `<section class="shell section compact beta-clarity-panel"><div class="order-panel"><div><p class="eyebrow">Pre-release requests</p><h2>You can request apps still in development.</h2><p>A strong request tells us your device, real use case, and what you can test. That helps prioritize which app gets a launch pass and tester build next.</p></div><div class="hero-actions"><a class="button" href="mailto:${site.betaEmail}?subject=Pre-release%20tester%20request">Email tester request</a><a class="button secondary" href="../apps/">Browse apps</a></div></div></section>`;

const supportPath = resolve(siteRoot, "support/index.html");
let supportHtml = await readText(supportPath);
supportHtml = replaceMeta(replaceMain(supportHtml, supportBody), site, "Help & Support", "Get Maxxed app support, beta access, WordPress plugin guidance, pricing help, or custom build routing.", "support/");
await writeText(supportPath, supportHtml);

const betaPath = resolve(siteRoot, "beta/index.html");
let betaHtml = await readText(betaPath);
if (!betaHtml.includes("You can request apps still in development.")) {
  betaHtml = insertBeforeMainEnd(betaHtml, "You can request apps still in development.", betaInsert);
  await writeText(betaPath, betaHtml);
}

let css = await readText(cssPath);
if (!css.includes("/* Support and mobile polish */")) {
  css += `

/* Support and mobile polish */
.support-route-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.support-route-card {
  min-height: 300px;
  padding: 26px;
  border: 1px solid var(--line);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}
.support-route-card.featured { border-color: rgba(185, 237, 69, 0.45); background: linear-gradient(180deg, rgba(185, 237, 69, 0.1), var(--surface)); }
.support-route-card h2 { margin: 22px 0 12px; font-size: clamp(26px, 3vw, 36px); }
.support-route-card p { color: var(--muted); }
.support-route-card .button { margin-top: auto; }
.support-polish-form {
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}
.beta-clarity-panel { padding-top: 0; }
@media (max-width: 1180px) { .support-route-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) {
  .support-route-grid { grid-template-columns: 1fr; }
  .support-route-card { min-height: auto; }
  .home-hero-grid { gap: 28px; }
  .presence-console { border-radius: 14px; }
  .product-stack-card { grid-template-columns: 1fr; }
  .product-stack-card .app-icon { width: 42px; }
  .path-card h2,
  .section-lane-card h3 { overflow-wrap: anywhere; }
}
@media (max-width: 520px) {
  h1 { font-size: clamp(38px, 13vw, 56px); }
  h2 { font-size: clamp(29px, 9vw, 42px); }
  .button, .nav-button { min-height: 48px; }
  .app-card, .path-card, .section-lane-card, .support-route-card, .order-type-card { padding: 20px; }
  .proof-row span, .fact-row span { font-size: 11px; }
  .footer-grid { gap: 26px; }
}
`;
  await writeText(cssPath, css);
}
