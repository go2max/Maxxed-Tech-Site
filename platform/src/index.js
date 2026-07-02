import { publicCatalog } from "./catalog.js";
import { actorCan, listAdminUsers, upsertAdminUser } from "./admin-users.js";
import { listAuditEvents, safeAuditEvent } from "./audit.js";
import { buildCatalog } from "./build-catalog.js";
import { scanCatalogSelection } from "./build-scanner.js";
import { cancelBuildBatch, createBuildBatch, listBuildBatches } from "./build-queue.js";
import { publicBuildRecipes } from "./build-recipes.js";
import { handleBuildWorkerApi } from "./build-worker.js";
import { assessBatchReadiness, markBatchTestingReady, publicQaRules } from "./qa-gates.js";
import { polishReport, publicPolishChecklist } from "./polish-review.js";
import { buildDashboard } from "./build-dashboard.js";
import { listGithubLinks, upsertGithubLink } from "./github-bridge.js";
import { handleLiveReport } from "./live-report.js";
import { createJob, downloadEvidence, handleRunnerApi, listArtifacts, listJobs, uploadArtifact } from "./pipeline.js";

const securityHeaders = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
};

function authenticatedEmail(request, env) {
  const email = (
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("oai-authenticated-user-email") ||
    ""
  ).trim().toLowerCase();
  const allowed = String(env.ADMIN_ALLOWED_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return email && allowed.includes(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function requestIdentityEmail(request) {
  return (
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("oai-authenticated-user-email") ||
    "anonymous"
  );
}

async function requestJson(request) {
  try { return await request.json(); } catch { return null; }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...securityHeaders, "content-type": "application/json; charset=utf-8" } });
}

async function requirePermission(actor, env, permission) {
  return await actorCan(actor, env, permission) ? null : json({ error: "Permission denied." }, 403);
}

function page(email) {
  const catalog = JSON.stringify(publicCatalog()).replaceAll("<", "\\u003c");
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Testing Functions | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button,select,input{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}h2{margin:5px 0}p{color:#b5c5ce;line-height:1.5}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 34px}.quick{border:1px solid #2a4150;border-top:3px solid var(--accent);border-radius:7px;background:#0d1d29;padding:16px}.quick h3{margin:0 0 4px}.quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.upload,.toolbar{display:grid;grid-template-columns:1fr 2fr auto;gap:12px;margin:18px 0;padding:16px;border:1px solid #2a4150;background:#0d1d29;border-radius:8px}.toolbar{grid-template-columns:1fr 1.4fr 1fr auto auto;position:sticky;top:10px;z-index:3}label{display:grid;gap:6px;color:#b9c8d0;font-size:13px}select,input{width:100%;padding:10px;border:1px solid #3a5261;border-radius:5px;background:#081621;color:#fff}.button{align-self:end;padding:10px 14px;border:1px solid #35d0ba;border-radius:5px;background:#35d0ba;color:#041418;font-weight:800;cursor:pointer}.button.secondary{background:transparent;color:#eef5f7;border-color:#3a5261}.button.small{padding:7px 12px}.button:disabled{opacity:.45;cursor:not-allowed}.suite{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;border:1px solid #2a4150;border-radius:7px;background:#0d1d29;margin:10px 0;padding:15px}.suite input{width:20px;height:20px}.suite-head{display:flex;justify-content:space-between;gap:18px}.suite h3{font-size:16px;margin:0}.suite p{margin:5px 0}.tag,.state{display:inline-block;margin:5px 5px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.manual{color:#ffd166}.status{min-height:24px;margin-top:14px;color:#dbe8ed}.fine{font-size:12px;color:#8fa4af}.jobs{display:grid;gap:10px;margin-top:16px}.job{border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:15px}.job-head{display:flex;justify-content:space-between;gap:12px}.steps{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.evidence a{color:#77d8cb;margin-right:10px;font-size:12px}.empty{color:#8fa4af;padding:16px;border:1px dashed #2a4150}@media(max-width:900px){.quick-grid{grid-template-columns:repeat(2,1fr)}.toolbar,.upload{grid-template-columns:1fr 1fr}}@media(max-width:760px){.layout{grid-template-columns:1fr}.nav{display:none}.quick-grid{grid-template-columns:1fr}.toolbar,.upload{grid-template-columns:1fr;position:static}.button{width:100%}.suite{grid-template-columns:auto 1fr}.suite>.button{grid-column:2}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>Operations</strong><a class="active" href="/admin/testing-functions/">Testing Functions</a><a href="/admin/builds/">Build Dashboard</a><a href="/admin/catalog/">Build Catalog</a><a href="/admin/security/">Security Audit</a><a href="/admin/settings/">Settings</a></nav>
<main><p class="eyebrow">QA operations</p><h1>Testing Functions</h1><p>Upload a test APK, run an approved suite or selected scripts, and follow sequential results from one leased Android device.</p>
<section><p class="eyebrow">APK intake</p><h2>Upload test artifact</h2><div class="upload"><label>Product<select id="uploadApp"></select></label><label>APK file<input id="apk" type="file" accept=".apk,application/vnd.android.package-archive"></label><button class="button" id="upload" type="button">Upload APK</button></div><p class="status" id="uploadStatus" aria-live="polite"></p></section>
<section><h2>Quick runs</h2><div class="quick-grid" id="quick"></div></section>
<section><p class="eyebrow">Individual app tests</p><h2>Choose scripts</h2><div class="toolbar"><label>Product<select id="app"></select></label><label>APK artifact<select id="artifact"></select></label><label>Starting selection<select id="suite"></select></label><button class="button secondary" id="clear" type="button">Clear</button><button class="button" id="runSelected" type="button" disabled>Run selected</button></div>
<div id="details"></div><p class="status" id="status" aria-live="polite"></p><p class="fine">The browser submits approved IDs only. It cannot provide commands, executable paths, or shell arguments.</p></section>
<section><p class="eyebrow">Runner activity</p><h2>Recent jobs</h2><div class="jobs" id="jobs"><div class="empty">No jobs loaded.</div></div></section></main></div>
<script>const catalog=${catalog};const app=document.querySelector('#app'),artifact=document.querySelector('#artifact'),suite=document.querySelector('#suite'),details=document.querySelector('#details'),status=document.querySelector('#status'),runSelected=document.querySelector('#runSelected'),clear=document.querySelector('#clear'),uploadApp=document.querySelector('#uploadApp'),apk=document.querySelector('#apk'),upload=document.querySelector('#upload'),uploadStatus=document.querySelector('#uploadStatus');
const selected=new Set();let artifacts=[];for(const product of catalog){app.add(new Option(product.name,product.id));uploadApp.add(new Option(product.name,product.id))}
function item(){return catalog.find(x=>x.id===app.value)}function selectedSuite(){return item().suites.find(x=>x.id===suite.value)}
async function api(path,options){const response=await fetch(path,options),body=response.status===204?{}:await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body}
function artifactFor(appId){return artifacts.find(x=>x.app_id===appId)}
async function queue(appId,payload,button){const selectedArtifact=appId===app.value?artifact.value:artifactFor(appId)?.id;if(!selectedArtifact){status.textContent='Upload an APK for this app first.';return}button.disabled=true;status.textContent='Queueing approved test job...';try{const body=await api('/api/test-jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({appId,artifactId:selectedArtifact,...payload})});status.textContent='Queued job '+body.id+' with '+body.scriptIds.length+' script'+(body.scriptIds.length===1?'':'s')+'. Waiting for the local runner.';await loadJobs()}catch(error){status.textContent=error.message}finally{button.disabled=false;updateSelection()}}
function renderQuick(){document.querySelector('#quick').innerHTML=catalog.map(product=>{const smoke=product.suites.find(x=>x.id==='smoke'),full=product.suites.find(x=>x.id==='oneClick')||product.suites.find(x=>x.id==='full'),ready=Boolean(artifactFor(product.id));return '<article class="quick" style="--accent:'+product.accent+'"><h3>'+product.name+'</h3><span class="fine">'+(ready?'APK ready':'Upload APK first')+'</span><div class="quick-actions"><button class="button small" '+(ready?'':'disabled')+' data-app="'+product.id+'" data-suite="'+smoke.id+'">Run smoke</button><button class="button secondary small" '+(ready?'':'disabled')+' data-app="'+product.id+'" data-suite="'+full.id+'">Run full</button></div></article>'}).join('');document.querySelectorAll('[data-suite]').forEach(button=>button.addEventListener('click',()=>queue(button.dataset.app,{suiteId:button.dataset.suite},button)))}
function renderArtifacts(){const matches=artifacts.filter(x=>x.app_id===app.value);artifact.replaceChildren(...(matches.length?matches.map(x=>new Option(x.file_name+' · '+x.sha256.slice(0,10),x.id)):[new Option('No APK uploaded','')]));renderQuick();updateSelection()}
async function loadArtifacts(){const body=await api('/api/test-artifacts');artifacts=body.artifacts;renderArtifacts()}
function renderSuites(){suite.replaceChildren(new Option('Choose manually',''),...item().suites.map(x=>new Option(x.label,x.id)));selected.clear();renderArtifacts();renderDetails()}
function renderDetails(){details.innerHTML=item().scripts.map(s=>'<article class="suite"><input type="checkbox" aria-label="Select '+s.label+'" data-check="'+s.id+'" '+(selected.has(s.id)?'checked':'')+'><div><div class="suite-head"><h3>'+s.label+'</h3><strong>'+s.minutes+' min</strong></div><p>'+s.description+'</p>'+s.requires.map(x=>'<span class="tag">'+x+'</span>').join('')+(s.manualObservation?'<span class="tag manual">Manual observation</span>':'')+'</div><button class="button secondary small" data-one="'+s.id+'">Run</button></article>').join('');document.querySelectorAll('[data-check]').forEach(box=>box.addEventListener('change',()=>{box.checked?selected.add(box.dataset.check):selected.delete(box.dataset.check);updateSelection()}));document.querySelectorAll('[data-one]').forEach(button=>button.addEventListener('click',()=>queue(item().id,{scriptIds:[button.dataset.one]},button)));updateSelection()}
function updateSelection(){runSelected.textContent=selected.size?'Run selected ('+selected.size+')':'Run selected';runSelected.disabled=selected.size===0||!artifact.value}
async function loadJobs(){try{const body=await api('/api/test-jobs');document.querySelector('#jobs').innerHTML=body.jobs.length?body.jobs.map(job=>'<article class="job"><div class="job-head"><div><strong>'+catalog.find(x=>x.id===job.app_id).name+'</strong><div class="fine">'+job.file_name+' · '+job.id.slice(0,8)+(job.device_serial?' · '+job.device_serial:'')+'</div></div><span class="state">'+job.state+'</span></div><div class="steps">'+job.steps.map(step=>'<span class="tag">'+step.script_id+': '+step.state+'</span>').join('')+'</div><div class="evidence">'+job.evidence.map(file=>'<a href="/api/test-evidence/'+file.id+'">'+file.file_name+'</a>').join('')+'</div></article>').join(''):'<div class="empty">No test jobs yet.</div>'}catch(error){document.querySelector('#jobs').innerHTML='<div class="empty">'+error.message+'</div>'}}
upload.addEventListener('click',async()=>{const file=apk.files[0];if(!file){uploadStatus.textContent='Choose an APK file.';return}upload.disabled=true;uploadStatus.textContent='Hashing and uploading '+file.name+'...';try{const body=await api('/api/test-artifacts',{method:'POST',headers:{'content-type':'application/vnd.android.package-archive','x-app-id':uploadApp.value,'x-file-name':file.name},body:file});uploadStatus.textContent='Uploaded '+body.artifact.file_name+' · SHA-256 '+body.artifact.sha256;app.value=uploadApp.value;await loadArtifacts()}catch(error){uploadStatus.textContent=error.message}finally{upload.disabled=false}});
app.addEventListener('change',renderSuites);artifact.addEventListener('change',updateSelection);suite.addEventListener('change',()=>{selected.clear();if(suite.value)selectedSuite().scriptIds.forEach(id=>selected.add(id));renderDetails()});clear.addEventListener('click',()=>{selected.clear();suite.value='';renderDetails()});runSelected.addEventListener('click',()=>queue(item().id,{scriptIds:[...selected]},runSelected));renderSuites();Promise.all([loadArtifacts(),loadJobs()]).catch(error=>status.textContent=error.message);setInterval(loadJobs,5000);</script></body></html>`;
}

function auditPage(email) {
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Security Audit | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button,select{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}p{color:#b5c5ce;line-height:1.5}.toolbar{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:20px 0;padding:16px;border:1px solid #2a4150;background:#0d1d29;border-radius:8px}label{display:grid;gap:6px;color:#b9c8d0;font-size:13px}select{padding:10px;border:1px solid #3a5261;border-radius:5px;background:#081621;color:#fff}.button{padding:10px 14px;border:1px solid #35d0ba;border-radius:5px;background:#35d0ba;color:#041418;font-weight:800;cursor:pointer}.events{display:grid;gap:10px}.event{border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:15px}.event-head{display:flex;justify-content:space-between;gap:12px}.event strong{display:block}.tag{display:inline-block;margin:7px 6px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.fine{font-size:12px;color:#8fa4af}.empty{color:#8fa4af;padding:16px;border:1px dashed #2a4150}@media(max-width:760px){.layout{grid-template-columns:1fr}.nav{display:none}.event-head{display:block}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>Security</strong><a href="/admin/testing-functions/">Testing Functions</a><a href="/admin/builds/">Build Dashboard</a><a href="/admin/catalog/">Build Catalog</a><a class="active" href="/admin/security/">Security Audit</a><a href="/admin/settings/">Settings</a></nav>
<main><p class="eyebrow">Security</p><h1>Audit Events</h1><p>Review admin access, denied requests, artifact uploads, queued test jobs, and future worker actions from the protected backend log.</p>
<div class="toolbar"><label>Rows<select id="limit"><option>50</option><option>100</option><option>200</option></select></label><button class="button" id="refresh" type="button">Refresh</button><span class="fine" id="status" aria-live="polite"></span></div>
<div class="events" id="events"><div class="empty">Loading audit events...</div></div></main></div>
<script>const events=document.querySelector('#events'),status=document.querySelector('#status'),limit=document.querySelector('#limit'),refresh=document.querySelector('#refresh');
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function load(){refresh.disabled=true;status.textContent='Loading...';try{const response=await fetch('/api/audit-events?limit='+encodeURIComponent(limit.value));const body=await response.json();if(!response.ok)throw new Error(body.error||'Request failed');events.innerHTML=body.events.length?body.events.map(event=>{const req=event.details?.request||{};return '<article class="event"><div class="event-head"><div><strong>'+esc(event.action)+'</strong><span class="fine">'+esc(event.actor_email)+' · '+esc(event.created_at)+'</span></div><span class="tag">'+esc(event.target_type)+': '+esc(event.target_id)+'</span></div><span class="tag">'+esc(req.method||'')+' '+esc(req.path||'')+'</span><span class="tag">country '+esc(req.country||'unknown')+'</span><span class="tag">ip '+esc(req.ipHash?req.ipHash.slice(0,12):'none')+'</span><span class="tag">ray '+esc(req.ray||'unknown')+'</span></article>'}).join(''):'<div class="empty">No audit events found.</div>';status.textContent='Loaded '+body.events.length+' event'+(body.events.length===1?'':'s')+'.'}catch(error){events.innerHTML='<div class="empty">'+esc(error.message)+'</div>';status.textContent=''}finally{refresh.disabled=false}}
refresh.addEventListener('click',load);limit.addEventListener('change',load);load();setInterval(load,15000);</script></body></html>`;
}

function settingsPage(email) {
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Settings | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button,select,input{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}p{color:#b5c5ce;line-height:1.5}.panel{margin:20px 0;padding:16px;border:1px solid #2a4150;background:#0d1d29;border-radius:8px}.form{display:grid;grid-template-columns:1.3fr .7fr .7fr auto;gap:12px;align-items:end}label{display:grid;gap:6px;color:#b9c8d0;font-size:13px}select,input{width:100%;padding:10px;border:1px solid #3a5261;border-radius:5px;background:#081621;color:#fff}.button{padding:10px 14px;border:1px solid #35d0ba;border-radius:5px;background:#35d0ba;color:#041418;font-weight:800;cursor:pointer}.users{display:grid;gap:10px}.user{border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:15px}.user-head{display:flex;justify-content:space-between;gap:12px}.tag{display:inline-block;margin:7px 6px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.fine{font-size:12px;color:#8fa4af}.empty{color:#8fa4af;padding:16px;border:1px dashed #2a4150}@media(max-width:820px){.layout{grid-template-columns:1fr}.nav{display:none}.form{grid-template-columns:1fr}.user-head{display:block}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>System</strong><a href="/admin/testing-functions/">Testing Functions</a><a href="/admin/builds/">Build Dashboard</a><a href="/admin/catalog/">Build Catalog</a><a href="/admin/security/">Security Audit</a><a class="active" href="/admin/settings/">Settings</a></nav>
<main><p class="eyebrow">Role auth</p><h1>Admin Settings</h1><p>Manage admin roles before catalog, build, GitHub, and Codex worker actions are enabled.</p>
<section class="panel"><h2>Add or update user</h2><div class="form"><label>Email<input id="email" type="email" autocomplete="off" placeholder="admin@example.com"></label><label>Role<select id="role"><option value="owner">owner</option><option value="builder">builder</option><option value="qa">qa</option><option value="viewer">viewer</option></select></label><label>Status<select id="state"><option value="active">active</option><option value="disabled">disabled</option></select></label><button class="button" id="save" type="button">Save role</button></div><p class="fine" id="status" aria-live="polite"></p></section>
<section><h2>Current users</h2><div class="users" id="users"><div class="empty">Loading users...</div></div></section></main></div>
<script>const email=document.querySelector('#email'),role=document.querySelector('#role'),state=document.querySelector('#state'),save=document.querySelector('#save'),status=document.querySelector('#status'),users=document.querySelector('#users');
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(path,options){const response=await fetch(path,options);const body=await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body}
function render(body){users.innerHTML=body.users.length?body.users.map(user=>'<article class="user"><div class="user-head"><div><strong>'+esc(user.email)+'</strong><div class="fine">'+esc(user.display_name||'')+'</div></div><span class="tag">'+esc(user.role)+'</span></div><span class="tag">'+esc(user.status)+'</span><span class="tag">'+esc(user.source)+'</span><span class="tag">'+esc((body.roles[user.role]||[]).join(', '))+'</span></article>').join(''):'<div class="empty">No admin users found.</div>'}
async function load(){try{render(await api('/api/admin-users'));status.textContent=''}catch(error){users.innerHTML='<div class="empty">'+esc(error.message)+'</div>'}}
save.addEventListener('click',async()=>{save.disabled=true;status.textContent='Saving...';try{await api('/api/admin-users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.value,role:role.value,status:state.value})});email.value='';status.textContent='Saved role.';await load()}catch(error){status.textContent=error.message}finally{save.disabled=false}});
load();</script></body></html>`;
}

function catalogPage(email) {
  const catalog = JSON.stringify(buildCatalog()).replaceAll("<", "\\u003c");
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Build Catalog | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button,select,input{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}p{color:#b5c5ce;line-height:1.5}.toolbar{display:grid;grid-template-columns:1.2fr .7fr .7fr auto auto;gap:12px;align-items:end;margin:20px 0;padding:16px;border:1px solid #2a4150;background:#0d1d29;border-radius:8px}label{display:grid;gap:6px;color:#b9c8d0;font-size:13px}select,input{width:100%;padding:10px;border:1px solid #3a5261;border-radius:5px;background:#081621;color:#fff}.button{padding:10px 14px;border:1px solid #35d0ba;border-radius:5px;background:#35d0ba;color:#041418;font-weight:800;cursor:pointer}.button.secondary{background:transparent;color:#eef5f7;border-color:#3a5261}.products{display:grid;gap:10px}.product{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:15px}.product input{width:20px;height:20px}.product h2{font-size:16px;margin:0}.tag{display:inline-block;margin:7px 6px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.fine{font-size:12px;color:#8fa4af}.status{min-height:22px;color:#dbe8ed}.empty{color:#8fa4af;padding:16px;border:1px dashed #2a4150}@media(max-width:900px){.toolbar{grid-template-columns:1fr 1fr}.layout{grid-template-columns:1fr}.nav{display:none}}@media(max-width:640px){.toolbar,.product{grid-template-columns:1fr}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>Builds</strong><a href="/admin/testing-functions/">Testing Functions</a><a href="/admin/builds/">Build Dashboard</a><a class="active" href="/admin/catalog/">Build Catalog</a><a href="/admin/settings/">Settings</a><a href="/admin/security/">Security Audit</a></nav>
<main><p class="eyebrow">Catalog</p><h1>Build Catalog</h1><p>Select products to scan, decide whether each should become a new build or extend an existing product, and prepare the batch queue for the next worker step.</p>
<div class="toolbar"><label>Search<input id="search" type="search" placeholder="Search products"></label><label>Platform<select id="platform"></select></label><label>State<select id="state"></select></label><button class="button secondary" id="clear" type="button">Clear</button><button class="button secondary" id="scan" type="button">Scan selected</button><button class="button" id="queue" type="button">Queue build batch</button><button class="button secondary" id="copy" type="button">Copy selected IDs</button></div>
<p class="status" id="status" aria-live="polite"></p><section id="scanResults"></section><div class="products" id="products"></div></main></div>
<script>const catalog=${catalog};const search=document.querySelector('#search'),platform=document.querySelector('#platform'),state=document.querySelector('#state'),products=document.querySelector('#products'),status=document.querySelector('#status'),clear=document.querySelector('#clear'),copy=document.querySelector('#copy'),scan=document.querySelector('#scan'),queue=document.querySelector('#queue'),scanResults=document.querySelector('#scanResults');const selected=new Set();
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function opts(select,values,label){select.replaceChildren(new Option(label,''),...values.map(value=>new Option(value,value)))}
opts(platform,[...new Set(catalog.products.map(item=>item.platform))].sort(),'All platforms');opts(state,[...new Set(catalog.products.map(item=>item.state))].sort(),'All states');
function visible(item){const q=search.value.trim().toLowerCase();return (!q||[item.id,item.name,item.family,item.platform,item.state].join(' ').toLowerCase().includes(q))&&(!platform.value||item.platform===platform.value)&&(!state.value||item.state===state.value)}
function render(){const rows=catalog.products.filter(visible);products.innerHTML=rows.length?rows.map(item=>'<article class="product"><input type="checkbox" aria-label="Select '+esc(item.name)+'" data-id="'+esc(item.id)+'" '+(selected.has(item.id)?'checked':'')+'><div><h2>'+esc(item.name)+'</h2><span class="fine">'+esc(item.id)+'</span><div><span class="tag">'+esc(item.platform)+'</span><span class="tag">'+esc(item.state)+'</span><span class="tag">'+esc(item.family)+'</span></div></div><button class="button secondary" data-one="'+esc(item.id)+'" type="button">Select</button></article>').join(''):'<div class="empty">No matching products.</div>';document.querySelectorAll('[data-id]').forEach(box=>box.addEventListener('change',()=>{box.checked?selected.add(box.dataset.id):selected.delete(box.dataset.id);update()}));document.querySelectorAll('[data-one]').forEach(button=>button.addEventListener('click',()=>{selected.add(button.dataset.one);render();update()}));update()}
function update(){status.textContent=selected.size+' selected. Scan selected before queueing build work.'}
[search,platform,state].forEach(input=>input.addEventListener('input',render));clear.addEventListener('click',()=>{selected.clear();search.value='';platform.value='';state.value='';scanResults.innerHTML='';render()});copy.addEventListener('click',async()=>{const text=JSON.stringify([...selected],null,2);try{await navigator.clipboard.writeText(text);status.textContent='Copied '+selected.size+' selected ID'+(selected.size===1?'':'s')+'.'}catch{status.textContent=text}});
scan.addEventListener('click',async()=>{if(!selected.size){status.textContent='Select at least one product first.';return}scan.disabled=true;status.textContent='Scanning selected catalog items...';try{const response=await fetch('/api/build-scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productIds:[...selected]})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Scan failed');scanResults.innerHTML='<div class="products">'+body.results.map(result=>'<article class="product"><div><h2>'+esc(result.name||result.id)+'</h2><span class="fine">'+esc(result.id)+'</span><div><span class="tag">'+esc(result.decision)+'</span><span class="tag">confidence '+esc(result.confidence)+'</span>'+(result.targetProductId?'<span class="tag">target '+esc(result.targetProductId)+'</span>':'')+'</div><p>'+esc((result.reasons||[]).join(' '))+'</p></div></article>').join('')+'</div>';status.textContent='Scanned '+body.results.length+' selected item'+(body.results.length===1?'':'s')+'.'}catch(error){status.textContent=error.message}finally{scan.disabled=false}});
queue.addEventListener('click',async()=>{if(!selected.size){status.textContent='Select at least one product first.';return}queue.disabled=true;status.textContent='Creating build batch...';try{const response=await fetch('/api/build-batches',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productIds:[...selected]})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Queue failed');status.textContent='Queued build batch '+body.batch.id.slice(0,8)+' with '+body.batch.itemCount+' item'+(body.batch.itemCount===1?'':'s')+'.'}catch(error){status.textContent=error.message}finally{queue.disabled=false}});
render();</script></body></html>`;
}

function buildsPage(email) {
  const safeEmail = email.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Build Dashboard | Maxxed Admin</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#eef5f7;background:#07131f}*{box-sizing:border-box}body{margin:0}button{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid #263947;padding:18px 0;background:#0c1c29}.top .shell{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-weight:800}.identity{font-size:13px;color:#a9bbc6}.layout{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px 0}.nav{padding:10px 0}.nav strong,.nav a{display:block;padding:10px 12px}.nav a{color:#9fb3be;text-decoration:none}.nav a.active{color:#fff;background:#173042;border-left:3px solid #35d0ba}.eyebrow{color:#35d0ba;font-size:12px;font-weight:800;text-transform:uppercase}h1{font-size:32px;margin:6px 0 10px}p{color:#b5c5ce;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.card{border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:16px}.card strong{display:block;font-size:28px}.batches{display:grid;gap:10px}.batch{border:1px solid #2a4150;background:#0d1d29;border-radius:7px;padding:15px}.tag{display:inline-block;margin:7px 6px 0 0;padding:4px 7px;border-radius:4px;background:#183345;color:#bfe8df;font-size:11px}.button{margin-top:9px;padding:7px 11px;border:1px solid #3a5261;border-radius:5px;background:transparent;color:#eef5f7;cursor:pointer}.button:disabled{opacity:.45;cursor:not-allowed}.status{min-height:22px;color:#dbe8ed}.empty{color:#8fa4af;padding:16px;border:1px dashed #2a4150}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.layout{grid-template-columns:1fr}.nav{display:none}}@media(max-width:560px){.grid{grid-template-columns:1fr}.identity{display:none}}
</style></head><body><header class="top"><div class="shell"><span class="brand">Maxxed Admin</span><span class="identity">${safeEmail}</span></div></header>
<div class="shell layout"><nav class="nav" aria-label="Admin"><strong>Builds</strong><a href="/admin/testing-functions/">Testing Functions</a><a class="active" href="/admin/builds/">Build Dashboard</a><a href="/admin/catalog/">Build Catalog</a><a href="/admin/settings/">Settings</a><a href="/admin/security/">Security Audit</a></nav>
<main><p class="eyebrow">Workers</p><h1>Build Dashboard</h1><p>Review catalog coverage, command recipes, QA rules, polish checks, and recent build batches before preparing a PR.</p><div class="grid" id="summary"></div><h2>Recent build batches</h2><p class="status" id="status" aria-live="polite"></p><div class="batches" id="batches"><div class="empty">Loading build dashboard...</div></div></main></div>
<script>const summary=document.querySelector('#summary'),batches=document.querySelector('#batches'),status=document.querySelector('#status');const terminal=new Set(['passed','failed','blocked','cancelled']);function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}async function cancelBatch(id,button){if(!confirm('Cancel this build batch?'))return;button.disabled=true;status.textContent='Cancelling '+id.slice(0,8)+'...';try{const response=await fetch('/api/build-batches/'+encodeURIComponent(id)+'/cancel',{method:'POST'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Cancel failed');status.textContent='Cancelled '+id.slice(0,8)+'.';await load()}catch(error){status.textContent=error.message;button.disabled=false}}async function load(){try{const response=await fetch('/api/build-dashboard');const body=await response.json();if(!response.ok)throw new Error(body.error||'Request failed');summary.innerHTML=Object.entries(body.summary).map(([key,value])=>'<article class="card"><span class="tag">'+esc(key)+'</span><strong>'+esc(value)+'</strong></article>').join('');batches.innerHTML=body.batches.length?body.batches.map(batch=>'<article class="batch"><strong>'+esc(batch.title||batch.id)+'</strong><span class="tag">'+esc(batch.state)+'</span><span class="tag">'+esc(batch.created_at)+'</span>'+(batch.testing_ready_at?'<span class="tag">testing-ready '+esc(batch.testing_ready_at)+'</span>':'')+(terminal.has(batch.state)?'':'<br><button class="button" data-cancel="'+esc(batch.id)+'" type="button">Cancel batch</button>')+'</article>').join(''):'<div class="empty">No build batches queued yet.</div>';document.querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',()=>cancelBatch(button.dataset.cancel,button)))}catch(error){batches.innerHTML='<div class="empty">'+esc(error.message)+'</div>'}}load();setInterval(load,15000);</script></body></html>`;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/runner/")) return handleRunnerApi(request, env, url);
    if (url.pathname.startsWith("/api/build-runner/")) return handleBuildWorkerApi(request, env, url);
    const actor = authenticatedEmail(request, env);
    if (!actor) {
      await safeAuditEvent(env, request, url, {
        actorEmail: requestIdentityEmail(request),
        action: "admin.access.denied",
        targetType: "route",
        targetId: url.pathname,
        details: { reason: "email_not_allowed" }
      });
      return new Response("Administrative access required", { status: 403, headers: securityHeaders });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/admin/testing-functions/")) {
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin.page.viewed", targetType: "route", targetId: url.pathname });
      return new Response(page(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    }
    if (request.method === "GET" && (url.pathname === "/admin/security/" || url.pathname === "/security/")) {
      const denied = await requirePermission(actor, env, "audit:view");
      if (denied) return denied;
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin.security.viewed", targetType: "route", targetId: url.pathname });
      return new Response(auditPage(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    }
    if (request.method === "GET" && (url.pathname === "/admin/settings/" || url.pathname === "/settings/")) {
      const denied = await requirePermission(actor, env, "settings:manage");
      if (denied) return denied;
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin.settings.viewed", targetType: "route", targetId: url.pathname });
      return new Response(settingsPage(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    }
    if (request.method === "GET" && (url.pathname === "/admin/catalog/" || url.pathname === "/catalog/")) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin.catalog.viewed", targetType: "route", targetId: url.pathname });
      return new Response(catalogPage(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    }
    if (request.method === "GET" && (url.pathname === "/admin/builds/" || url.pathname === "/builds/")) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin.builds.viewed", targetType: "route", targetId: url.pathname });
      return new Response(buildsPage(actor), { headers: { "content-type": "text/html; charset=utf-8", ...securityHeaders } });
    }
    if (request.method === "GET" && url.pathname === "/api/report/live") return handleLiveReport(request, env);
    if (request.method === "GET" && url.pathname === "/api/build-dashboard") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return buildDashboard(env);
    }
    if (request.method === "GET" && url.pathname === "/api/build-catalog") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return json(buildCatalog());
    }
    if (request.method === "POST" && url.pathname === "/api/build-scan") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      const input = await requestJson(request);
      const result = scanCatalogSelection(input?.productIds);
      await safeAuditEvent(env, request, url, { actorEmail: actor, action: "build_catalog.scanned", targetType: "build_scan", targetId: "selection", details: { count: result.results.length } });
      return json(result);
    }
    if (request.method === "GET" && url.pathname === "/api/build-batches") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return listBuildBatches(env);
    }
    if (request.method === "GET" && url.pathname === "/api/build-recipes") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return json({ recipes: publicBuildRecipes() });
    }
    if (request.method === "GET" && url.pathname === "/api/qa-rules") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return json(publicQaRules());
    }
    if (request.method === "GET" && url.pathname === "/api/polish-checklist") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return json(publicPolishChecklist());
    }
    const readiness = url.pathname.match(/^\/api\/build-batches\/([A-Za-z0-9-]+)\/readiness$/);
    if (request.method === "GET" && readiness) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return assessBatchReadiness(env, readiness[1]);
    }
    if (request.method === "POST" && readiness) {
      const response = await markBatchTestingReady(request, env, actor, readiness[1]);
      if (response.ok) await safeAuditEvent(env, request, url, { actorEmail: actor, action: "build_batch.testing_ready", targetType: "build_batch", targetId: readiness[1] });
      return response;
    }
    const polish = url.pathname.match(/^\/api\/build-batches\/([A-Za-z0-9-]+)\/polish-report$/);
    if (request.method === "GET" && polish) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return polishReport(env, polish[1]);
    }
    const githubLinks = url.pathname.match(/^\/api\/build-batches\/([A-Za-z0-9-]+)\/github-links$/);
    if (request.method === "GET" && githubLinks) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return listGithubLinks(env, githubLinks[1]);
    }
    if (request.method === "POST" && githubLinks) {
      const response = await upsertGithubLink(request.clone(), env, actor, githubLinks[1]);
      if (response.ok) await safeAuditEvent(env, request, url, { actorEmail: actor, action: "github_link.upserted", targetType: "build_batch", targetId: githubLinks[1] });
      return response;
    }
    const cancelBatch = url.pathname.match(/^\/api\/build-batches\/([A-Za-z0-9-]+)\/cancel$/);
    if (request.method === "POST" && cancelBatch) {
      const response = await cancelBuildBatch(env, actor, cancelBatch[1]);
      if (response.ok) await safeAuditEvent(env, request, url, { actorEmail: actor, action: "build_batch.cancelled", targetType: "build_batch", targetId: cancelBatch[1] });
      return response;
    }
    if (request.method === "POST" && url.pathname === "/api/build-batches") {
      const response = await createBuildBatch(request.clone(), env, actor);
      if (response.ok) await safeAuditEvent(env, request, url, { actorEmail: actor, action: "build_batch.queued", targetType: "build_batch", targetId: "selection" });
      return response;
    }
    if (request.method === "GET" && url.pathname === "/api/audit-events") {
      const denied = await requirePermission(actor, env, "audit:view");
      if (denied) return denied;
      return listAuditEvents(env, url);
    }
    if (request.method === "GET" && url.pathname === "/api/admin-users") {
      const denied = await requirePermission(actor, env, "settings:manage");
      if (denied) return denied;
      return listAdminUsers(env);
    }
    if (request.method === "POST" && url.pathname === "/api/admin-users") {
      const response = await upsertAdminUser(request.clone(), env, actor);
      if (response.ok) await safeAuditEvent(env, request, url, { actorEmail: actor, action: "admin_user.upserted", targetType: "admin_user", targetId: "role-settings" });
      return response;
    }
    if (request.method === "GET" && url.pathname === "/api/test-catalog") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return json(publicCatalog());
    }
    if (request.method === "GET" && url.pathname === "/api/test-artifacts") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return listArtifacts(env);
    }
    if (request.method === "POST" && url.pathname === "/api/test-artifacts") {
      const denied = await requirePermission(actor, env, "worker:queue");
      if (denied) return denied;
      return uploadArtifact(request, env, actor, url);
    }
    if (request.method === "GET" && url.pathname === "/api/test-jobs") {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return listJobs(env);
    }
    if (request.method === "POST" && url.pathname === "/api/test-jobs") {
      const denied = await requirePermission(actor, env, "worker:queue");
      if (denied) return denied;
      return createJob(request, env, actor, url);
    }
    const evidence = url.pathname.match(/^\/api\/test-evidence\/([A-Za-z0-9-]+)$/);
    if (request.method === "GET" && evidence) {
      const denied = await requirePermission(actor, env, "catalog:view");
      if (denied) return denied;
      return downloadEvidence(env, evidence[1]);
    }
    return json({ error: "Not found" }, 404);
  }
};
