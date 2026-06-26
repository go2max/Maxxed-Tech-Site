import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { productSeedsFromPublicCatalog } from './catalog.mjs';

const out = resolve('dist-admin');
const dataPath = resolve('admin/data/admin-seed.json');

async function readSeed() {
  try {
    return JSON.parse(await readFile(dataPath, 'utf8'));
  } catch {
    return { generatedAt: new Date().toISOString(), products: productSeedsFromPublicCatalog(), integrations: [], readinessGates: [], auditEvents: [] };
  }
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function statusChip(value) {
  const label = value || 'not_configured';
  return `<span class="chip chip-${escapeHtml(label).replaceAll('_','-')}">${escapeHtml(label)}</span>`;
}

function productRows(products) {
  return products.map((product) => `<tr data-product-row data-archived="${product.archived ? 'true' : 'false'}">
    <td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.slug)}</small></td>
    <td>${escapeHtml(product.packageId || 'Not configured')}</td>
    <td>${statusChip(product.lifecycle)}</td>
    <td>${statusChip(product.publicStatus)}</td>
    <td>${escapeHtml(product.currentTrack || 'Not configured')}</td>
    <td>${statusChip(product.sourceStatus)}</td>
    <td>${product.archived ? statusChip('archived') : statusChip('active')}</td>
  </tr>`).join('');
}

function integrationCards(integrations) {
  return integrations.map((integration) => `<article class="card"><h3>${escapeHtml(integration.label)}</h3><p>${statusChip(integration.state)}</p><p class="muted">Required env: ${escapeHtml((integration.requiredEnv || []).join(', ') || 'None recorded')}</p><p>${escapeHtml(integration.notes || '')}</p></article>`).join('');
}

function gateRows(gates, products) {
  const byId = new Map(products.map((product) => [product.id, product.name]));
  return gates.slice(0, 80).map((gate) => `<tr><td>${escapeHtml(byId.get(gate.productId) || 'Portfolio')}</td><td>${escapeHtml(gate.gateName)}</td><td>${statusChip(gate.state)}</td><td>${gate.mandatory ? 'Yes' : 'No'}</td><td>${escapeHtml(gate.notes || '')}</td></tr>`).join('');
}

const seed = await readSeed();
await mkdir(resolve(out, 'assets'), { recursive: true });
await mkdir(resolve(out, 'data'), { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Maxxed Admin Platform v1</title>
  <link rel="stylesheet" href="assets/admin.css">
</head>
<body>
  <aside class="sidebar"><div class="brand">MTS Admin</div><nav>
    <a href="#overview">Overview</a><a href="#products">Products</a><a href="#beta">Beta Applications</a><a href="#releases">Releases</a><a href="#support">Support Cases</a><a href="#issues">Known Issues</a><a href="#monitoring">Monitoring</a><a href="#readiness">Readiness</a><a href="#integrations">Integrations</a><a href="#audit">Audit Log</a><a href="#access">Access Directory</a><a href="#settings">Settings</a>
  </nav></aside>
  <main class="main">
    <section id="overview" class="panel hero"><p class="eyebrow">Private platform</p><h1>Maxxed Admin Platform v1</h1><p>This dashboard is designed for <strong>admin.techmaxxed.com</strong> behind Cloudflare Access. Public site output must remain separate.</p><div class="metrics"><div><strong>${seed.products.length}</strong><span>Products seeded</span></div><div><strong>${seed.integrations.length}</strong><span>Integrations tracked</span></div><div><strong>${seed.readinessGates.length}</strong><span>Readiness gates</span></div><div><strong>${seed.auditEvents.length}</strong><span>Audit events</span></div></div></section>
    <section id="products" class="panel"><div class="section-head"><div><p class="eyebrow">Data-driven catalog</p><h2>Products</h2></div><div class="actions"><button data-action="add-product">Add product</button><button data-action="show-archived">Show archived</button></div></div><input class="search" data-search placeholder="Search products, packages, lifecycle"><table><thead><tr><th>Product</th><th>Package</th><th>Lifecycle</th><th>Public status</th><th>Track</th><th>Source</th><th>State</th></tr></thead><tbody>${productRows(seed.products)}</tbody></table></section>
    <section id="beta" class="panel"><h2>Beta Applications</h2><p class="empty">No live beta application store is configured yet. Queues are ready for New, Email verification pending, Manual review pending, Approved, Rejected, Approved but not enrolled, Group membership active, Opt-in link sent, Active tester, Inactive, and Removal requested.</p></section>
    <section id="releases" class="panel"><h2>Releases</h2><p class="empty">Release records will track version, artifact SHA-256, signer fingerprint, debuggable state, SDK targets, Play track, rollout, evidence, and approval gates. No production rollout is automatic.</p></section>
    <section id="support" class="panel"><h2>Support Cases</h2><p class="empty">Support cases can link product, version, device, Android version, known issue, release, and readiness blocker.</p></section>
    <section id="issues" class="panel"><h2>Known Issues</h2><p class="empty">Known issues support severity, affected versions, workaround, private/public visibility, and release-blocker state.</p></section>
    <section id="monitoring" class="panel"><h2>Monitoring</h2><div class="cards">${seed.monitoringChecks.map((check) => `<article class="card"><h3>${escapeHtml(check.label)}</h3>${statusChip(check.sourceStatus)}<p class="muted">${escapeHtml(check.targetUrl || 'No URL target configured')}</p></article>`).join('')}</div></section>
    <section id="readiness" class="panel"><h2>Readiness</h2><table><thead><tr><th>Product</th><th>Gate</th><th>State</th><th>Mandatory</th><th>Notes</th></tr></thead><tbody>${gateRows(seed.readinessGates, seed.products)}</tbody></table></section>
    <section id="integrations" class="panel"><h2>Integrations</h2><div class="cards">${integrationCards(seed.integrations)}</div></section>
    <section id="audit" class="panel"><h2>Audit Log</h2><p class="empty">Audit events are append-only and recorded for every mutation: product add/archive/restore, beta transitions, release approvals, access changes, support updates, and integration changes.</p></section>
    <section id="access" class="panel"><h2>Access Directory</h2><p class="empty">Access is role-based and deny-by-default. Production identity comes from Cloudflare Access or equivalent trusted headers.</p></section>
    <section id="settings" class="panel"><h2>Settings</h2><p class="empty">Settings must never expose secret values. Credential source names are allowed; raw credentials are not.</p></section>
  </main>
  <script src="assets/admin.js" defer></script>
</body>
</html>`;

const css = `:root{color-scheme:dark;--bg:#07131f;--panel:#0d1c2b;--panel2:#12263a;--text:#edf7ff;--muted:#9eb2c8;--line:#264158;--accent:#25d0d8;--warn:#ffc44d;--bad:#ff715b;--good:#b9ed45}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:260px;background:#06111d;border-right:1px solid var(--line);padding:24px;overflow:auto}.brand{font-size:20px;font-weight:800;margin-bottom:24px}nav{display:grid;gap:8px}nav a{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:10px}nav a:hover{background:var(--panel2);color:var(--text)}.main{margin-left:260px;padding:28px;display:grid;gap:22px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:0 18px 60px #0004}.hero{background:linear-gradient(135deg,#0d1c2b,#10314a)}h1,h2,h3,p{margin-top:0}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metrics div,.card{background:var(--panel2);border:1px solid var(--line);border-radius:16px;padding:16px}.metrics strong{display:block;font-size:28px}.metrics span,.muted,.empty{color:var(--muted)}.section-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.actions{display:flex;gap:10px}button{background:var(--accent);border:0;color:#031016;border-radius:999px;padding:10px 14px;font-weight:800}.search{width:100%;margin:12px 0 16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#06111d;color:var(--text)}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px;vertical-align:top}td small{display:block;color:var(--muted)}.chip{display:inline-block;padding:4px 8px;border-radius:999px;background:#20394f;color:var(--text);font-size:12px;font-weight:700}.chip-pass,.chip-active,.chip-configured{background:#314f20;color:var(--good)}.chip-fail,.chip-blocked{background:#55281f;color:var(--bad)}.chip-not-configured,.chip-not-run,.chip-insufficient-data,.chip-unavailable{background:#4b3e1e;color:var(--warn)}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}@media(max-width:900px){.sidebar{position:static;width:auto}.main{margin-left:0;padding:16px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
const js = `document.querySelectorAll('[data-search]').forEach((input)=>{input.addEventListener('input',()=>{const q=input.value.toLowerCase();document.querySelectorAll('[data-product-row]').forEach((row)=>{row.hidden=!row.textContent.toLowerCase().includes(q);});});});document.querySelector('[data-action="show-archived"]')?.addEventListener('click',()=>{document.querySelectorAll('[data-product-row][data-archived="true"]').forEach(row=>row.hidden=false);});document.querySelector('[data-action="add-product"]')?.addEventListener('click',()=>alert('Add Product is implemented in the data/API skeleton. Production deployment must enforce RBAC and write an audit event.'));`;

await writeFile(resolve(out, 'index.html'), html, 'utf8');
await writeFile(resolve(out, 'assets/admin.css'), css, 'utf8');
await writeFile(resolve(out, 'assets/admin.js'), js, 'utf8');
await writeFile(resolve(out, 'data/admin-seed.json'), `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
console.log(`Built admin app into ${out}`);
