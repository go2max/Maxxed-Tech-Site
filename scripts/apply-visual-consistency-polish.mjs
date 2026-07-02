import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteRoot = resolve(root, "site");
const cssPath = resolve(siteRoot, "assets/site.css");

let css = await readFile(cssPath, "utf8");

if (!css.includes("/* Visual consistency polish */")) {
  css += `

/* Visual consistency polish */
:root {
  --section-pad-lg: clamp(76px, 9vw, 128px);
  --section-pad-md: clamp(54px, 7vw, 92px);
  --card-pad: clamp(22px, 3vw, 32px);
  --radius-lg: 24px;
  --radius-md: 18px;
}
.section { padding-top: var(--section-pad-md); padding-bottom: var(--section-pad-md); }
.section-hero .section,
.presence-hero,
.product-hero { padding-top: var(--section-pad-lg); padding-bottom: var(--section-pad-lg); }
.section-head { gap: clamp(18px, 3vw, 36px); margin-bottom: clamp(24px, 4vw, 42px); }
.section-head h2 { max-width: 820px; }
.section-head p { max-width: 620px; line-height: 1.7; }
.lede { max-width: 760px; }
.app-card,
.path-card,
.section-lane-card,
.product-stack-card,
.order-type-card,
.support-route-card,
.conversion-route-grid article,
.trust-strip article,
.request-grid article,
.mini-route-grid a,
.conversion-panel,
.order-panel,
.founder-panel,
.product-visual,
.presence-console {
  border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}
.path-card,
.section-lane-card,
.support-route-card,
.conversion-route-grid article,
.order-type-card,
.request-grid article,
.trust-strip article { padding: var(--card-pad); }
.app-card,
.path-card,
.section-lane-card,
.support-route-card,
.conversion-route-grid article,
.mini-route-grid a,
.order-type-card { transition: transform 160ms ease, border-color 160ms ease, background 160ms ease; }
.app-card:hover,
.path-card:hover,
.section-lane-card:hover,
.support-route-card:hover,
.conversion-route-grid article:hover,
.order-type-card:hover { transform: translateY(-3px); border-color: rgba(83, 216, 255, 0.5); }
.button,
.nav-button { white-space: nowrap; }
.hero-actions,
.form-actions { gap: 12px; }
.hero-actions .button,
.form-actions .button { justify-content: center; }
.status,
.pill,
.eyebrow { letter-spacing: 0.08em; }
.fact-row,
.proof-row { gap: 8px; }
.fact-row span,
.proof-row span { display: inline-flex; align-items: center; justify-content: center; min-height: 30px; }
.product-conversion-panel { padding-top: clamp(36px, 6vw, 72px); }
.conversion-panel { gap: clamp(22px, 4vw, 44px); }
.copy-grid { gap: clamp(28px, 5vw, 64px); }
.footer-grid { align-items: start; }
.founder-line { margin-top: 22px; }
@media (max-width: 980px) {
  .section-head { align-items: start; }
  .hero-actions,
  .form-actions { align-items: stretch; }
  .hero-actions .button,
  .form-actions .button { width: 100%; }
  .order-panel,
  .conversion-panel,
  .founder-panel { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .shell { width: min(100% - 28px, var(--max)); }
  .section { padding-top: 54px; padding-bottom: 54px; }
  .section-hero .section,
  .presence-hero,
  .product-hero { padding-top: 62px; padding-bottom: 62px; }
  .app-card,
  .path-card,
  .section-lane-card,
  .support-route-card,
  .conversion-route-grid article,
  .order-type-card,
  .request-grid article,
  .trust-strip article,
  .mini-route-grid a { padding: 20px; }
  .button,
  .nav-button { width: 100%; min-height: 48px; }
  .proof-row,
  .fact-row { display: grid; grid-template-columns: repeat(2, 1fr); }
  .product-conversion-panel { padding-top: 34px; }
}
`;
  await writeFile(cssPath, css, "utf8");
}
