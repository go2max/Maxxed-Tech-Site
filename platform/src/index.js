import { appById, publicCatalog } from "./catalog.js";

const securityHeaders = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
};

function authenticatedEmail(request, env) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const allowed = String(env.ADMIN_ALLOWED_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return email && allowed.includes(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8" } });
}

function page(email) {
  const catalog = JSON.stringify(publicCatalog()).replaceAll("<", "\\u003c");
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Testing Functions | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button,select,input{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}h2{margin:5px 0}p{color:#b5c5ce;line-height:1.5}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 34px}.quick{border:1px solid #2a4150;border-top:3px solid var(--accent);border-radius:7px;background:#0d1d29;padding:16px}.quick h3{margin:0 0 4px}.quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.toolbar{display:grid;grid-template-columns:1fr 1fr auto auto;gap:12px;margin:18px 0;padding:16px;border:1px solid #2a4150;background:#0d1d29;border-radius:8px;position:sticky;top:10px;z-index:3}label{display:grid;gap:6px;color:#b9c8d0;font-size:13px}select,input{width:100%;padding:10px;border:1px solid #3a5261;border-radius:5px;background:#081621;color:#fff}.button{align-self:end;padding:10px 14px;border:1px solid #35d0ba;border-radius:5px;background:#35d0ba;color:#041418;font-weight:800;cursor:pointer}.button.secondary{background:transparent;color:#eef5f7;border-color:#3a5261}.button.small{padding:7px 12px}.button:disabled{opacity:.45;cursor:not-allowed}.suite{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;border:1px solid #2a4150;border-radius:7px;background:#0d1d29;margin:10px 0;padding:15px}.suite input{width:20px;height:20px}.suite-head{display:flex;justify-content:space-between;gap:18px}.suite h3{font-size:16px;margin:0}.suite p{margin:5px 0}.tag{display:inline-block;margin:5px 5px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.manual{color:#ffd166}.status{min-height:24px;margin-top:14px;color:#dbe8ed}.fine{font-size:12px;color:#8fa4af}@media(max-width:900px){.quick-grid{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr 1fr}}@media(max-width:760px){.layout{grid-template-columns:1fr}.nav{display:none}.quick-grid{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr;position:static}.button{width:100%}.suite{grid-template-columns:auto 1fr}.suite>.button{grid-column:2}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>Operations</strong><a class="active" href="/admin/testing-functions/">Testing Functions</a></nav>
<main><p class="eyebrow">QA operations</p><h1>Testing Functions</h1><p>Run an approved suite from the main page, or choose one or several scripts for a specific app. Every job runs sequentially on one leased Android runner.</p>
<section><h2>Quick runs</h2><div class="quick-grid" id="quick"></div></section>
<section><p class="eyebrow">Individual app tests</p><h2>Choose scripts</h2><div class="toolbar"><label>Product<select id="app"></select></label><label>Starting selection<select id="suite"></select></label><button class="button secondary" id="clear" type="button">Clear</button><button class="button" id="runSelected" type="button" disabled>Run selected</button></div>
<div id="details"></div><p class="status" id="status" aria-live="polite"></p><p class="fine">The browser submits approved IDs only. It cannot provide commands, executable paths, or shell arguments.</p></section></main></div>
<script>const catalog=${catalog};const app=document.querySelector('#app'),suite=document.querySelector('#suite'),details=document.querySelector('#details'),status=document.querySelector('#status'),runSelected=document.querySelector('#runSelected'),clear=document.querySelector('#clear');
const selected=new Set();for(const item of catalog)app.add(new Option(item.name,item.id));
function item(){return catalog.find(x=>x.id===app.value)}function selectedSuite(){return item().suites.find(x=>x.id===suite.value)}
async function queue(appId,payload,button){button.disabled=true;status.textContent='Queueing approved test job...';try{const response=await fetch('/api/test-jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({appId,...payload})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Queue request failed');status.textContent='Queued job '+body.id+' with '+body.scriptIds.length+' script'+(body.scriptIds.length===1?'':'s')+'. Waiting for the local runner.'}catch(error){status.textContent=error.message}finally{button.disabled=false;updateSelection()}}
function renderQuick(){document.querySelector('#quick').innerHTML=catalog.map(product=>{const smoke=product.suites.find(x=>x.id==='smoke'),full=product.suites.find(x=>x.id==='oneClick')||product.suites.find(x=>x.id==='full');return '<article class="quick" style="--accent:'+product.accent+'"><h3>'+product.name+'</h3><span class="fine">'+product.scripts.length+' approved scripts</span><div class="quick-actions"><button class="button small" data-app="'+product.id+'" data-suite="'+smoke.id+'">Run smoke</button><button class="button secondary small" data-app="'+product.id+'" data-suite="'+full.id+'">Run full</button></div></article>'}).join('');document.querySelectorAll('[data-suite]').forEach(button=>button.addEventListener('click',()=>queue(button.dataset.app,{suiteId:button.dataset.suite},button)))}
function renderSuites(){suite.replaceChildren(new Option('Choose manually',''),...item().suites.map(x=>new Option(x.label,x.id)));selected.clear();renderDetails()}
function renderDetails(){details.innerHTML=item().scripts.map(s=>'<article class="suite"><input type="checkbox" aria-label="Select '+s.label+'" data-check="'+s.id+'" '+(selected.has(s.id)?'checked':'')+'><div><div class="suite-head"><h3>'+s.label+'</h3><strong>'+s.minutes+' min</strong></div><p>'+s.description+'</p>'+s.requires.map(x=>'<span class="tag">'+x+'</span>').join('')+(s.manualObservation?'<span class="tag manual">Manual observation</span>':'')+'</div><button class="button secondary small" data-one="'+s.id+'">Run</button></article>').join('');document.querySelectorAll('[data-check]').forEach(box=>box.addEventListener('change',()=>{box.checked?selected.add(box.dataset.check):selected.delete(box.dataset.check);updateSelection()}));document.querySelectorAll('[data-one]').forEach(button=>button.addEventListener('click',()=>queue(item().id,{scriptIds:[button.dataset.one]},button)));updateSelection()}
function updateSelection(){runSelected.textContent=selected.size?'Run selected ('+selected.size+')':'Run selected';runSelected.disabled=selected.size===0}
app.addEventListener('change',renderSuites);suite.addEventListener('change',()=>{selected.clear();if(suite.value)selectedSuite().scriptIds.forEach(id=>selected.add(id));renderDetails()});clear.addEventListener('click',()=>{selected.clear();suite.value='';renderDetails()});runSelected.addEventListener('click',()=>queue(item().id,{scriptIds:[...selected]},runSelected));renderQuick();renderSuites();</script></body></html>`;
}

async function createJob(request, env, actor, url) {
  if (!env.DB) return json({ error: "The private admin database is unavailable." }, 503);
  if (request.headers.get("origin") !== url.origin) return json({ error: "Invalid request origin." }, 403);
  let input;
  try { input = await request.json(); } catch { return json({ error: "A valid JSON body is required." }, 400); }
  const app = appById.get(input?.appId);
  if (!app) return json({ error: "Unknown app." }, 400);
  const suite = input.suiteId ? app.suites?.[input.suiteId] : null;
  if (input.suiteId && !suite) return json({ error: "Unknown suite." }, 400);
  const scriptIds = suite || (Array.isArray(input.scriptIds) ? input.scriptIds.map(String) : []);
  const uniqueScriptIds = [...new Set(scriptIds)];
  if (uniqueScriptIds.length === 0 || uniqueScriptIds.length > 25) return json({ error: "Choose one or more scripts." }, 400);
  const allowed = new Set(app.scripts.map((script) => script.id));
  if (uniqueScriptIds.some((id) => !allowed.has(id))) return json({ error: "Unapproved script ID." }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO test_jobs (id, app_id, suite_id, script_ids, state, created_by, created_at) VALUES (?, ?, ?, ?, 'queued', ?, ?)").bind(id, app.id, input.suiteId || null, JSON.stringify(uniqueScriptIds), actor, now),
    env.DB.prepare("INSERT INTO audit_events (id, actor_email, action, target_type, target_id, details, created_at) VALUES (?, ?, 'test_job.queued', 'test_job', ?, ?, ?)").bind(crypto.randomUUID(), actor, id, JSON.stringify({ appId: app.id, suiteId: input.suiteId || null, scriptIds: uniqueScriptIds }), now)
  ]);
  return json({ id, state: "queued", scriptIds: uniqueScriptIds }, 201);
}

export default {
  async fetch(request, env = {}) {
    const actor = authenticatedEmail(request, env);
    if (!actor) return new Response("Administrative access required", { status: 403, headers: securityHeaders });
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/admin/testing-functions/")) return new Response(page(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    if (request.method === "GET" && url.pathname === "/api/test-catalog") return json(publicCatalog());
    if (request.method === "POST" && url.pathname === "/api/test-jobs") return createJob(request, env, actor, url);
    return json({ error: "Not found" }, 404);
  }
};
