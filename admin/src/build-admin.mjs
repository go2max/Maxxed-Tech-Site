import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capacityRisk, capacitySnapshot, commerceGroups, commercePlans, commerceProducts } from './commerce.mjs';
import { productSeedsFromPublicCatalog } from './catalog.mjs';
import { liveBoardItemsFromProducts } from './live-board.mjs';

const out = resolve('dist-admin');
const dataPath = resolve('admin/data/admin-seed.json');

async function readSeed() {
  const fallbackProducts = productSeedsFromPublicCatalog();
  try {
    const seed = JSON.parse(await readFile(dataPath, 'utf8'));
    seed.products ||= fallbackProducts;
    seed.liveBoardItems ||= liveBoardItemsFromProducts(seed.products, seed.generatedAt);
    seed.integrations ||= [];
    seed.readinessGates ||= [];
    seed.auditEvents ||= [];
    seed.monitoringChecks ||= [];
    return seed;
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      products: fallbackProducts,
      liveBoardItems: liveBoardItemsFromProducts(fallbackProducts),
      integrations: [],
      readinessGates: [],
      monitoringChecks: [],
      auditEvents: []
    };
  }
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function statusChip(value) {
  const label = value || 'not_configured';
  return `<span class="chip chip-${escapeHtml(label).replaceAll('_','-')}">${escapeHtml(label)}</span>`;
}

function dot(value) {
  const state = value || 'gray';
  return `<span class="status-dot status-${escapeHtml(state)}" aria-label="${escapeHtml(state)} status"></span>`;
}

function manualBadge(item) {
  if (!item.manualOverride) return '';
  return `<div class="manual-badge"><strong>Manual override</strong><span>${escapeHtml(item.manualOverrideBy || 'Unknown admin')} · ${escapeHtml(item.manualOverrideAt || 'time not recorded')}</span><span>${escapeHtml(item.manualOverrideReason || 'No reason recorded')}</span></div>`;
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

function liveBoardRows(items) {
  return items.map((item) => `<tr data-live-board-row data-live-id="${escapeHtml(item.id)}" data-health="${escapeHtml(item.health)}" data-manual="${item.manualOverride ? 'true' : 'false'}">
    <td><div class="health-cell">${dot(item.health)}<div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.slug)} · ${escapeHtml(item.type || 'product')}</small></div></div>${manualBadge(item)}</td>
    <td>${statusChip(item.onlineState)}<small>${escapeHtml(item.category || '')}</small></td>
    <td>${statusChip(item.lastTestStatus)}<small>${escapeHtml(item.lastTestAt || 'No test timestamp')}</small></td>
    <td>${escapeHtml(item.crashStatus || 'No crash status')}<small>Last failure: ${escapeHtml(item.lastFailureAt || 'None recorded')}</small></td>
    <td><small>${escapeHtml(item.evidence || '')}</small><small>Source: ${escapeHtml(item.checkSource || 'unknown')}</small></td>
    <td><button class="secondary" data-manual-override="${escapeHtml(item.id)}">Manual override</button></td>
  </tr>`).join('');
}

function integrationCards(integrations) {
  return integrations.map((integration) => `<article class="card"><h3>${escapeHtml(integration.label)}</h3><p>${statusChip(integration.state)}</p><p class="muted">Required env: ${escapeHtml((integration.requiredEnv || []).join(', ') || 'None recorded')}</p><p>${escapeHtml(integration.notes || '')}</p></article>`).join('');
}

function gateRows(gates, products) {
  const byId = new Map(products.map((product) => [product.id, product.name]));
  return gates.slice(0, 120).map((gate) => `<tr><td>${escapeHtml(byId.get(gate.productId) || 'Portfolio')}</td><td>${escapeHtml(gate.gateName)}</td><td>${statusChip(gate.state)}</td><td>${gate.mandatory ? 'Yes' : 'No'}</td><td>${escapeHtml(gate.notes || '')}</td></tr>`).join('');
}

function commerceProductRows() {
  return commerceProducts.map((product) => `<tr>
    <td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.slug)} · ${escapeHtml(product.productType)}</small></td>
    <td>${statusChip(product.group)}<small>${escapeHtml(product.entitlementKey)}</small></td>
    <td>${statusChip(product.salesStatus)}<small>${escapeHtml(product.checkoutState)}</small></td>
    <td>${escapeHtml(product.demoModel)}<small>${escapeHtml(product.demoLimit)}</small></td>
    <td>${product.standalone ? 'Standalone' : 'Bundled only'}<small>${product.bundleEligible ? 'Bundle eligible' : 'Not bundle-first'}</small></td>
  </tr>`).join('');
}

function commercePlanRows() {
  return commercePlans.map((plan) => `<tr>
    <td><strong>${escapeHtml(plan.name)}</strong><small>${escapeHtml(plan.slug)} · ${escapeHtml(plan.billingModel)}</small></td>
    <td>${statusChip(plan.group)}</td>
    <td>$${Number(plan.monthlyUsd || 0).toFixed(2)}<small>Annual: $${Number(plan.annualUsd || 0).toFixed(2)}</small></td>
    <td>${escapeHtml(plan.trialDays)} days<small>${escapeHtml(plan.overagePolicy)}</small></td>
    <td>${escapeHtml(plan.includedSeats)} seats<small>${escapeHtml(plan.includedActions)} actions · ${escapeHtml(plan.includedStorageGb)}GB storage</small></td>
    <td>${plan.extraSeatUsd ? `$${Number(plan.extraSeatUsd).toFixed(2)} / seat` : 'No seat add-on'}<small>${plan.overageUsd ? `$${Number(plan.overageUsd).toFixed(2)} / ${escapeHtml(plan.overageUnit)}` : 'No usage overage'}</small></td>
  </tr>`).join('');
}

function groupCards() {
  return commerceGroups.map((group) => `<article class="card"><h3>${escapeHtml(group.name)}</h3><p>${statusChip(group.purchaseMode)}</p><p class="muted">Buyer: ${escapeHtml(group.buyerType)}</p><p>${escapeHtml(group.description)}</p></article>`).join('');
}

const seed = await readSeed();
await mkdir(resolve(out, 'assets'), { recursive: true });
await mkdir(resolve(out, 'data'), { recursive: true });

const healthCounts = seed.liveBoardItems.reduce((counts, item) => {
  counts[item.health] = (counts[item.health] || 0) + 1;
  return counts;
}, {});
const risk = capacityRisk(capacitySnapshot);

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
    <a href="#overview">Overview</a><a href="#commerce">Commerce</a><a href="#pricing">Plans</a><a href="#capacity">Capacity</a><a href="#live-board">Live Board</a><a href="#products">Products</a><a href="#beta">Beta Applications</a><a href="#releases">Releases</a><a href="#support">Support Cases</a><a href="#issues">Known Issues</a><a href="#monitoring">Monitoring</a><a href="#readiness">Readiness</a><a href="#integrations">Integrations</a><a href="#audit">Audit Log</a><a href="#access">Access Directory</a><a href="#settings">Settings</a>
  </nav></aside>
  <main class="main">
    <section id="overview" class="panel hero"><p class="eyebrow">Private platform</p><h1>Maxxed Admin Platform v1</h1><p>This dashboard is designed for <strong>admin.techmaxxed.com</strong> behind Cloudflare Access. Public site output must remain separate.</p><div class="metrics"><div><strong>${seed.products.length}</strong><span>Products seeded</span></div><div><strong>${commerceProducts.length}</strong><span>Commerce products</span></div><div><strong>${commercePlans.length}</strong><span>Sellable plans</span></div><div><strong>${risk.projectedLevel}</strong><span>30-day capacity risk</span></div></div></section>
    <section id="commerce" class="panel"><div class="section-head"><div><p class="eyebrow">Sales model</p><h2>Commerce Products</h2><p class="muted">Website purchase is the source of truth. Apps, plugins, and stores unlock through Maxxed entitlements.</p></div><div class="actions"><button data-action="add-commerce-product">Add commerce product</button><button class="secondary" data-action="connect-stripe">Connect Stripe later</button></div></div><div class="cards">${groupCards()}</div><table><thead><tr><th>Product</th><th>Group / entitlement</th><th>Status</th><th>Demo</th><th>Purchase</th></tr></thead><tbody>${commerceProductRows()}</tbody></table></section>
    <section id="pricing" class="panel"><div class="section-head"><div><p class="eyebrow">Monthly, annual, seat, usage</p><h2>Plans</h2><p class="muted">Business plans support per-business base billing, included seats, add-on seats, included usage, and metered overage after allowance.</p></div></div><table><thead><tr><th>Plan</th><th>Group</th><th>Price</th><th>Demo / overage</th><th>Included</th><th>Add-ons</th></tr></thead><tbody>${commercePlanRows()}</tbody></table></section>
    <section id="capacity" class="panel"><div class="section-head"><div><p class="eyebrow">Server protection</p><h2>Capacity & Subscriber Exposure</h2><p class="muted">Use this before approving more trials or paid accounts so the 50GB launch server does not hit emergency conditions.</p></div></div><div class="metrics"><div><strong>${capacitySnapshot.currentDiskUsedGb}GB</strong><span>Disk used / ${capacitySnapshot.serverDiskGb}GB</span></div><div><strong>${capacitySnapshot.projectedThirtyDayDiskGb}GB</strong><span>Projected 30-day disk</span></div><div><strong>${capacitySnapshot.promisedStorageGb}GB</strong><span>Promised plan storage</span></div><div><strong>${risk.promisedLevel}</strong><span>Promised exposure risk</span></div></div><p class="manual-badge"><strong>Recommendation</strong><span>${escapeHtml(risk.recommendation)}</span></p><table><thead><tr><th>Resource</th><th>Current</th><th>Limit</th><th>Policy</th></tr></thead><tbody><tr><td>Disk</td><td>${capacitySnapshot.currentDiskUsedGb}GB</td><td>${capacitySnapshot.serverDiskGb}GB</td><td>Warn at 70%, critical at 85%, freeze large writes near 95%.</td></tr><tr><td>Uploads</td><td>${capacitySnapshot.uploadsGb}GB</td><td>Launch server</td><td>Move to object storage before high-storage business approvals.</td></tr><tr><td>Logs/backups</td><td>${capacitySnapshot.logsGb + capacitySnapshot.backupGb}GB</td><td>Launch server</td><td>Rotate aggressively and keep backups external.</td></tr></tbody></table></section>
    <section id="live-board" class="panel"><div class="section-head"><div><p class="eyebrow">Apps, programs, plugins</p><h2>Live Board</h2><p class="muted">Refreshes every 3 minutes from the local admin data artifact. Manual browser overrides are intentionally labeled and do not replace committed source data.</p></div><div class="actions"><button data-action="refresh-live-board">Refresh now</button><button class="secondary" data-action="clear-local-overrides">Clear local overrides</button></div></div><div class="legend"><span>${dot('green')} Healthy / passed</span><span>${dot('red')} Failed / down</span><span>${dot('yellow')} Needs review</span><span>${dot('gray')} Not connected</span></div><input class="search" data-live-search placeholder="Search live board, status, test evidence"><table><thead><tr><th>Item</th><th>Stage</th><th>Last test</th><th>Crash / failure</th><th>Evidence</th><th>Manual</th></tr></thead><tbody data-live-board-body>${liveBoardRows(seed.liveBoardItems)}</tbody></table></section>
    <section id="products" class="panel"><div class="section-head"><div><p class="eyebrow">Data-driven catalog</p><h2>Products</h2></div><div class="actions"><button data-action="add-product">Add product</button><button data-action="show-archived" class="secondary">Show archived</button></div></div><input class="search" data-search placeholder="Search products, packages, lifecycle"><table><thead><tr><th>Product</th><th>Package</th><th>Lifecycle</th><th>Public status</th><th>Track</th><th>Source</th><th>State</th></tr></thead><tbody>${productRows(seed.products)}</tbody></table></section>
    <section id="beta" class="panel"><h2>Beta Applications</h2><p class="empty">No live beta application store is configured yet. Queues are ready for New, Email verification pending, Manual review pending, Approved, Rejected, Approved but not enrolled, Group membership active, Opt-in link sent, Active tester, Inactive, and Removal requested.</p></section>
    <section id="releases" class="panel"><h2>Releases</h2><p class="empty">Release records will track version, artifact SHA-256, signer fingerprint, debuggable state, SDK targets, Play track, rollout, evidence, and approval gates. No production rollout is automatic.</p></section>
    <section id="support" class="panel"><h2>Support Cases</h2><p class="empty">Support cases route to support@techmaxxed.com and can link product, version, device, known issue, release, readiness blocker, subscription state, and entitlement state.</p></section>
    <section id="issues" class="panel"><h2>Known Issues</h2><p class="empty">Known issues support severity, affected versions, workaround, private/public visibility, and release-blocker state.</p></section>
    <section id="monitoring" class="panel"><h2>Monitoring</h2><div class="cards">${seed.monitoringChecks.map((check) => `<article class="card"><h3>${escapeHtml(check.label)}</h3>${statusChip(check.sourceStatus)}<p class="muted">${escapeHtml(check.targetUrl || 'No URL target configured')}</p></article>`).join('')}</div></section>
    <section id="readiness" class="panel"><h2>Readiness</h2><table><thead><tr><th>Product</th><th>Gate</th><th>State</th><th>Mandatory</th><th>Notes</th></tr></thead><tbody>${gateRows(seed.readinessGates, seed.products)}</tbody></table></section>
    <section id="integrations" class="panel"><h2>Integrations</h2><div class="cards">${integrationCards(seed.integrations)}</div></section>
    <section id="audit" class="panel"><h2>Audit Log</h2><p class="empty">Audit events are append-only and recorded for every mutation: product add/archive/restore, commerce product changes, price changes, beta transitions, release approvals, access changes, support updates, and integration changes.</p></section>
    <section id="access" class="panel"><h2>Access Directory</h2><p class="empty">Access is role-based and deny-by-default. Production identity comes from Cloudflare Access or equivalent trusted headers.</p></section>
    <section id="settings" class="panel"><h2>Settings</h2><p class="empty">Settings must never expose secret values. Credential source names are allowed; raw credentials are not.</p></section>
  </main>
  <script src="assets/admin.js" defer></script>
</body>
</html>`;

const css = `:root{color-scheme:dark;--bg:#07131f;--panel:#0d1c2b;--panel2:#12263a;--text:#edf7ff;--muted:#9eb2c8;--line:#264158;--accent:#25d0d8;--warn:#ffc44d;--bad:#ff715b;--good:#b9ed45;--gray:#8796a8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:260px;background:#06111d;border-right:1px solid var(--line);padding:24px;overflow:auto}.brand{font-size:20px;font-weight:800;margin-bottom:24px}nav{display:grid;gap:8px}nav a{color:var(--muted);text-decoration:none;padding:10px 12px;border-radius:10px}nav a:hover{background:var(--panel2);color:var(--text)}.main{margin-left:260px;padding:28px;display:grid;gap:22px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:0 18px 60px #0004}.hero{background:linear-gradient(135deg,#0d1c2b,#10314a)}h1,h2,h3,p{margin-top:0}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0}.metrics div,.card{background:var(--panel2);border:1px solid var(--line);border-radius:16px;padding:16px}.metrics strong{display:block;font-size:28px}.metrics span,.muted,.empty{color:var(--muted)}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.actions{display:flex;gap:10px;flex-wrap:wrap}button{background:var(--accent);border:0;color:#031016;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer}.secondary{background:#20394f;color:var(--text);border:1px solid var(--line)}.search{width:100%;margin:12px 0 16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#06111d;color:var(--text)}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px;vertical-align:top}td small{display:block;color:var(--muted);margin-top:3px}.chip{display:inline-block;padding:4px 8px;border-radius:999px;background:#20394f;color:var(--text);font-size:12px;font-weight:700}.chip-pass,.chip-active,.chip-configured,.chip-testing,.chip-demo-ready,.chip-field,.chip-plugins,.chip-business,.chip-career,.chip-utility{background:#314f20;color:var(--good)}.chip-fail,.chip-blocked,.chip-crashed,.chip-down,.chip-critical,.chip-restricted,.chip-suspended{background:#55281f;color:var(--bad)}.chip-not-configured,.chip-not-run,.chip-insufficient-data,.chip-unavailable,.chip-needs-review,.chip-not-connected,.chip-release-prep,.chip-internal-testing,.chip-build-next,.chip-demo-planned,.chip-warning{background:#4b3e1e;color:var(--warn)}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:14px 0}.health-cell{display:flex;align-items:flex-start;gap:10px}.status-dot{width:13px;height:13px;border-radius:50%;display:inline-block;box-shadow:0 0 0 3px #ffffff18;margin-top:4px}.status-green{background:var(--good)}.status-red{background:var(--bad)}.status-yellow{background:var(--warn)}.status-gray{background:var(--gray)}.legend{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 4px;color:var(--muted)}.legend span{display:inline-flex;gap:8px;align-items:center}.manual-badge{margin-top:10px;border:1px solid var(--warn);background:#4b3e1e55;border-radius:12px;padding:8px;color:var(--warn)}.manual-badge span{display:block;font-size:12px;color:#ffe2a0}@media(max-width:900px){.sidebar{position:static;width:auto}.main{margin-left:0;padding:16px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:block}table{display:block;overflow:auto}}`;

const js = `const escapeHtml=(value)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');const statusChip=(value)=>{const label=value||'not_configured';return '<span class="chip chip-'+escapeHtml(label).replaceAll('_','-')+'">'+escapeHtml(label)+'</span>';};const dot=(value)=>'<span class="status-dot status-'+escapeHtml(value||'gray')+'"></span>';const overrideKey='mts-admin-live-board-overrides';const readOverrides=()=>{try{return JSON.parse(localStorage.getItem(overrideKey)||'{}')}catch{return {}}};const writeOverrides=(overrides)=>localStorage.setItem(overrideKey,JSON.stringify(overrides));const manualBadge=(item)=>item.manualOverride?'<div class="manual-badge"><strong>Manual override</strong><span>'+escapeHtml(item.manualOverrideBy||'Unknown admin')+' · '+escapeHtml(item.manualOverrideAt||'time not recorded')+'</span><span>'+escapeHtml(item.manualOverrideReason||'No reason recorded')+'</span></div>':'';const applyOverride=(item)=>{const override=readOverrides()[item.id];return override?{...item,...override,manualOverride:true,manualOverrideBy:'Local browser admin',manualOverrideAt:override.manualOverrideAt,manualOverrideReason:override.manualOverrideReason||'Local override; commit source data for canonical status.'}:item;};const row=(raw)=>{const item=applyOverride(raw);return '<tr data-live-board-row data-live-id="'+escapeHtml(item.id)+'" data-health="'+escapeHtml(item.health)+'" data-manual="'+(item.manualOverride?'true':'false')+'"><td><div class="health-cell">'+dot(item.health)+'<div><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.slug)+' · '+escapeHtml(item.type||'product')+'</small></div></div>'+manualBadge(item)+'</td><td>'+statusChip(item.onlineState)+'<small>'+escapeHtml(item.category||'')+'</small></td><td>'+statusChip(item.lastTestStatus)+'<small>'+escapeHtml(item.lastTestAt||'No test timestamp')+'</small></td><td>'+escapeHtml(item.crashStatus||'No crash status')+'<small>Last failure: '+escapeHtml(item.lastFailureAt||'None recorded')+'</small></td><td><small>'+escapeHtml(item.evidence||'')+'</small><small>Source: '+escapeHtml(item.checkSource||'unknown')+'</small></td><td><button class="secondary" data-manual-override="'+escapeHtml(item.id)+'">Manual override</button></td></tr>';};async function refreshLiveBoard(){const body=document.querySelector('[data-live-board-body]');if(!body)return;try{const response=await fetch('data/admin-seed.json?ts='+Date.now(),{cache:'no-store'});const seed=await response.json();body.innerHTML=(seed.liveBoardItems||[]).map(row).join('');}catch(error){console.warn('Live board refresh failed',error);}}document.addEventListener('click',(event)=>{const id=event.target?.dataset?.manualOverride;if(id){const health=prompt('Manual health: green, yellow, red, or gray','yellow');if(!['green','yellow','red','gray'].includes(health))return;const reason=prompt('Reason for manual override','Manual status update');const overrides=readOverrides();overrides[id]={health,onlineState:health==='red'?'manual_failure':'manual_review',lastTestStatus:'manual_override',crashStatus:health==='red'?'Manual failure override':'Manual review override',checkSource:'local_manual_override',manualOverrideAt:new Date().toISOString(),manualOverrideReason:reason||'Manual status update'};writeOverrides(overrides);refreshLiveBoard();}if(event.target?.dataset?.action==='refresh-live-board')refreshLiveBoard();if(event.target?.dataset?.action==='clear-local-overrides'){localStorage.removeItem(overrideKey);refreshLiveBoard();}if(event.target?.dataset?.action==='add-commerce-product')alert('Commerce product writes are scaffolded; connect RBAC-backed API before production mutation.');if(event.target?.dataset?.action==='connect-stripe')alert('Stripe is intentionally disabled until products, prices, webhooks, and entitlement shutoff are reviewed.');});document.querySelectorAll('[data-search]').forEach((input)=>{input.addEventListener('input',()=>{const q=input.value.toLowerCase();document.querySelectorAll('[data-product-row]').forEach((row)=>{row.hidden=!row.textContent.toLowerCase().includes(q);});});});document.querySelector('[data-live-search]')?.addEventListener('input',(event)=>{const q=event.target.value.toLowerCase();document.querySelectorAll('[data-live-board-row]').forEach((row)=>{row.hidden=!row.textContent.toLowerCase().includes(q);});});document.querySelector('[data-action="show-archived"]')?.addEventListener('click',()=>{document.querySelectorAll('[data-product-row][data-archived="true"]').forEach(row=>row.hidden=false);});document.querySelector('[data-action="add-product"]')?.addEventListener('click',()=>alert('Add Product is implemented in the data/API skeleton. Production deployment must enforce RBAC and write an audit event.'));setInterval(refreshLiveBoard,180000);`;

await writeFile(resolve(out, 'index.html'), html, 'utf8');
await writeFile(resolve(out, 'assets/admin.css'), css, 'utf8');
await writeFile(resolve(out, 'assets/admin.js'), js, 'utf8');
await writeFile(resolve(out, 'data/admin-seed.json'), `${JSON.stringify({ ...seed, commerceProducts, commercePlans, commerceGroups, capacitySnapshot, capacityRisk: risk }, null, 2)}\n`, 'utf8');
console.log(`Built admin app into ${out}`);
