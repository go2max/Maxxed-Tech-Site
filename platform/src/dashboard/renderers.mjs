function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function card(title, body) {
  return `<article class="card"><h2>${escapeHtml(title)}</h2>${body}</article>`;
}

function list(items, render) {
  return items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(render(item))}</li>`).join("")}</ul>`
    : '<p class="empty-state">No records are available yet.</p>';
}

export function renderPortfolioPage({ products, builds, releases, readiness }) {
  return `<section class="grid">
    ${card("Portfolio overview", list(products, (product) => `${escapeHtml(product.name)} <strong>${escapeHtml(product.lifecycle_status)}</strong>`))}
    ${card("Latest builds", list(builds, (build) => `${escapeHtml(build.version_name)} (${build.version_code})`))}
    ${card("Release readiness", list(readiness, (snapshot) => `Score ${snapshot.score} for ${escapeHtml(snapshot.product_id)}`))}
    ${card("Release pipeline", list(releases, (release) => `${escapeHtml(release.stage)} with QA ${escapeHtml(release.qa_approval_state)}`))}
  </section>`;
}

export function renderRecordPage(title, eyebrow, records, renderRecord) {
  return `<section class="card"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2>${list(records, renderRecord)}</section>`;
}

export function renderKnowledgeBasePage({ entries = [], revisions = [], canEdit = false, canPublish = false }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const revisionRows = revisions.length
    ? `<ul>${[...revisions].sort((left, right) => Number(right.revision_number) - Number(left.revision_number)).map((revision) => {
        const entry = entryById.get(revision.entry_id);
        const submit = canEdit && revision.workflow_state === "draft"
          ? `<button type="button" data-kb-submit data-revision-id="${escapeHtml(revision.id)}">Submit for review</button>`
          : "";
        const publish = canPublish && revision.workflow_state === "in_review"
          ? `<button type="button" data-kb-publish data-revision-id="${escapeHtml(revision.id)}">Publish revision</button>`
          : "";
        return `<li>
          <strong>${escapeHtml(entry?.slug || revision.entry_id)} revision ${escapeHtml(revision.revision_number)}</strong>
          <span> | ${escapeHtml(revision.workflow_state)} | ${escapeHtml(revision.classification)} | ${escapeHtml(revision.section)}</span><br>
          <span>${escapeHtml(revision.title)} | Author: ${escapeHtml(revision.author_email)} | Reviewer: ${escapeHtml(revision.reviewer_email || "pending")}</span><br>
          <span>Change: ${escapeHtml(revision.change_summary)}</span>
          <details><summary>Preview</summary><pre><code>${escapeHtml(revision.body)}</code></pre></details>
          <p>${submit} ${publish}</p>
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No revisions exist yet.</p>';
  const articleRows = entries.length
    ? `<ul>${entries.map((entry) => `<li>
        <strong>${escapeHtml(entry.title)}</strong> <code>${escapeHtml(entry.slug)}</code>
        <span> | ${escapeHtml(entry.publication_state)}</span>
        ${canPublish && entry.publication_state !== "archived" ? `<button type="button" data-kb-archive data-entry-id="${escapeHtml(entry.id)}">Archive</button>` : ""}
      </li>`).join("")}</ul>`
    : '<p class="empty-state">No knowledge-base articles exist yet.</p>';
  const editor = canEdit
    ? card("New draft revision", `<form id="knowledge-base-form">
        <label>Slug <input name="slug" required maxlength="100" pattern="[a-z0-9]+(?:-[a-z0-9]+)*"></label>
        <label>Title <input name="title" required maxlength="160"></label>
        <label>Section <select name="section"><option>architecture</option><option>security</option><option>release</option><option>qa</option><option>store-submission</option><option>runner</option><option>incident-response</option><option>backup</option><option>marketing</option><option>coding-standards</option><option>app-specific</option><option>general</option></select></label>
        <label>Classification <select name="classification"><option>internal</option><option>confidential</option><option>public</option></select></label>
        <label>Audience <select name="audience"><option>internal</option><option>engineering</option><option>qa</option><option>support</option><option>beta</option><option>public</option></select></label>
        <label>Related product ID <input name="productId" maxlength="100"></label>
        <label>Change summary <input name="changeSummary" required maxlength="500"></label>
        <label>Article body <textarea name="body" required maxlength="60000" rows="18"></textarea></label>
        <button type="submit">Save draft revision</button>
      </form><p id="knowledge-base-status" aria-live="polite"></p><script src="/knowledge-base.js" defer></script>`)
    : "";
  return `<section class="grid">
    ${editor}
    ${card("Articles", articleRows)}
    ${card("Revision queue", revisionRows)}
    ${card("Publication controls", "<p>Drafts are immutable revisions. Publication requires review by a different authorized user. Article bodies are always rendered as escaped text in this workspace.</p>")}
  </section>`;
}

export function renderUserAdminPage({ users = [], roleAssignments = [], roleEvents = [], roles = [] }) {
  const roleOptions = roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("");
  const directory = users.length
    ? `<ul>${users.map((user) => {
        const states = new Map();
        roleAssignments.filter((item) => item.user_id === user.id)
          .forEach((item) => states.set(item.role_name, "grant"));
        roleEvents.filter((item) => item.user_id === user.id)
          .sort((left, right) => Number(left.event_sequence || 0) - Number(right.event_sequence || 0))
          .forEach((item) => states.set(item.role_name, item.action));
        const activeRoles = [...states.entries()].filter(([, action]) => action === "grant").map(([role]) => role);
        const roleButtons = activeRoles.length
          ? activeRoles.map((role) => `<button type="button" data-role-revoke data-user-id="${escapeHtml(user.id)}" data-role-name="${escapeHtml(role)}">Remove ${escapeHtml(role)}</button>`).join(" ")
          : "<span>No roles assigned</span>";
        return `<li>
          <strong>${escapeHtml(user.display_name)}</strong> | ${escapeHtml(user.status)}<br>
          <code>${escapeHtml(user.email)}</code><br>
          <span>Roles: ${activeRoles.map(escapeHtml).join(" | ") || "none"}</span>
          <p>${roleButtons}</p>
          <p>
            <label>Grant role <select data-role-select="${escapeHtml(user.id)}">${roleOptions}</select></label>
            <button type="button" data-role-grant data-user-id="${escapeHtml(user.id)}">Grant role</button>
            <button type="button" data-user-status data-user-id="${escapeHtml(user.id)}" data-next-status="${user.status === "active" ? "inactive" : "active"}">${user.status === "active" ? "Deactivate user" : "Reactivate user"}</button>
          </p>
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No persistent users exist. Create the bootstrap Owner first.</p>';
  return `<section class="grid">
    ${card("Create user", `<form id="access-user-form">
      <label>Email <input type="email" name="email" required maxlength="254"></label>
      <label>Display name <input name="displayName" required maxlength="100"></label>
      <label>Status <select name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button type="submit">Create user</button>
    </form><p id="access-status" aria-live="polite"></p><script src="/users.js" defer></script>`)}
    ${card("Access directory", directory)}
    ${card("Safety rules", "<p>Roles come from the persistent access directory on every request. The last active Owner cannot be removed or deactivated. Identity authentication remains with the configured identity provider.</p>")}
  </section>`;
}

export function renderBackupPage({ backups = [] }) {
  const rows = backups.length
    ? `<ul>${[...backups].sort((left, right) => right.created_at.localeCompare(left.created_at)).map((backup) => {
        const counts = parseStoredJson(backup.table_counts_json, {});
        const details = parseStoredJson(backup.verification_details_json, {});
        return `<li>
          <strong>${escapeHtml(backup.storage_state)}</strong> <code>${escapeHtml(backup.id)}</code><br>
          <span>Created: ${escapeHtml(backup.created_at)} | Retained until: ${escapeHtml(backup.retention_until)}</span><br>
          <span>Encrypted bytes: ${escapeHtml(backup.byte_size)} | Plaintext SHA-256: <code>${escapeHtml(backup.plaintext_sha256)}</code></span><br>
          <span>Tables: ${escapeHtml(Object.keys(counts).length)} | Rows: ${escapeHtml(Object.values(counts).reduce((sum, count) => sum + Number(count), 0))} | Verified: ${escapeHtml(backup.verified_at || "not yet")}</span>
          ${details.error ? `<br><span>Verification error: ${escapeHtml(details.error)}</span>` : ""}
          <p><button type="button" data-backup-verify data-backup-id="${escapeHtml(backup.id)}">Run restore verification</button></p>
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No encrypted backup snapshots exist yet.</p>';
  return `<section class="grid">
    ${card("Backup controls", `<p><button type="button" data-backup-create>Create encrypted backup</button> <button type="button" data-backup-purge>Purge expired backups</button></p><p id="backup-status" aria-live="polite"></p><script src="/security/backups.js" defer></script>`)}
    ${card("Encrypted snapshots", rows)}
    ${card("Restore boundary", "<p>Verification decrypts into memory, checks table coverage, row counts, the plaintext digest, and the audit hash chain. It never writes snapshot data into the live database.</p>")}
  </section>`;
}

export function renderAuditPage(events) {
  return renderRecordPage("Audit log", "Security events", events, (event) => `${escapeHtml(event.action_name)} on ${escapeHtml(event.target_type)} by ${escapeHtml(event.actor_email)}`);
}

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function renderTestingFunctionsPage({ products = [], jobs = [], runners = [], schedules = [], fleetStaleMs = 120000, fleetOfflineMs = 600000 } = {}) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const recentJobs = [...jobs]
    .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))
    .slice(0, 50);
  const counts = jobs.reduce((summary, job) => {
    summary[job.lease_state] = (summary[job.lease_state] || 0) + 1;
    return summary;
  }, {});
  const terminalStates = new Set(["completed", "failed", "blocked", "interrupted", "cancelled"]);
  const fleetNow = Date.now();
  const fleet = [...runners]
    .sort((left, right) => String(right.last_seen_at).localeCompare(String(left.last_seen_at)))
    .map((runner) => {
      const ageMs = fleetNow - new Date(runner.last_seen_at).getTime();
      const health = !Number.isFinite(ageMs) || ageMs > fleetOfflineMs
        ? "offline"
        : ageMs > fleetStaleMs ? "stale" : "online";
      const parsedCapabilities = parseStoredJson(runner.product_ids_json, []);
      const capabilities = Array.isArray(parsedCapabilities) ? parsedCapabilities : [];
      const activeJob = jobs.find((job) =>
        job.runner_id === runner.runner_id &&
        job.device_id === runner.device_id &&
        ["running", "cancelling"].includes(job.lease_state)
      );
      return { ...runner, health, capabilities, activeJob };
    });
  const fleetMarkup = fleet.length
    ? `<ul>${fleet.map((runner) => `<li>
        <strong>${escapeHtml(runner.health)}</strong> ${escapeHtml(runner.runner_id)} on ${escapeHtml(runner.device_id)}<br>
        <span>Agent: ${escapeHtml(runner.agent_version)} | Apps: ${runner.capabilities.map((id) => escapeHtml(productById.get(id)?.name || id)).join(" | ")}</span><br>
        <span>Last seen: ${escapeHtml(runner.last_seen_at)} | Workload: ${runner.activeJob ? `${escapeHtml(runner.activeJob.product_id)} (${escapeHtml(runner.activeJob.lease_state)})` : "idle"}</span>
      </li>`).join("")}</ul>`
    : '<p class="empty-state">No runner has checked in yet.</p>';
  const productChoices = products.map((product) => `
    <label><input type="checkbox" name="productId" value="${escapeHtml(product.id)}"> ${escapeHtml(product.name)}</label>
  `).join("");
  const scheduleProductChoices = products.map((product) => `
    <label><input type="checkbox" name="scheduleProductId" value="${escapeHtml(product.id)}"> ${escapeHtml(product.name)}</label>
  `).join("");
  const scheduleMarkup = schedules.length
    ? `<ul>${[...schedules].sort((left, right) => left.next_run_at.localeCompare(right.next_run_at)).map((schedule) => {
        const scheduledProducts = parseStoredJson(schedule.product_ids_json, []);
        const enabled = Number(schedule.enabled) === 1;
        return `<li><strong>${escapeHtml(schedule.name)}</strong> | ${enabled ? "enabled" : "paused"}<br>
          <span>Apps: ${scheduledProducts.map((id) => escapeHtml(productById.get(id)?.name || id)).join(" | ")}</span><br>
          <span>Every ${escapeHtml(schedule.cadence_minutes)} minutes | Next: ${escapeHtml(schedule.next_run_at)} | Last: ${escapeHtml(schedule.last_run_at || "never")}</span><br>
          <span>Runner: ${escapeHtml(schedule.runner_id)} | Device: ${escapeHtml(schedule.device_id)}</span>
          <p><button type="button" data-schedule-toggle data-schedule-id="${escapeHtml(schedule.id)}" data-schedule-enabled="${enabled ? "false" : "true"}">${enabled ? "Pause schedule" : "Resume schedule"}</button></p>
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No regression schedules are configured.</p>';
  const productCatalog = products.map((product) => `<li>
    <strong>${escapeHtml(product.name)}</strong> <code>${escapeHtml(product.packageId)}</code><br>
    <span>${escapeHtml(product.coverage)}</span><br>
    <span>Steps: ${product.orderedSteps.map(escapeHtml).join(" | ")}</span><br>
    <button type="button" data-run-product="${escapeHtml(product.id)}">Queue ${escapeHtml(product.name)}</button>
  </li>`).join("");
  const productFilterOptions = products.map((product) =>
    `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`
  ).join("");
  const stateFilterOptions = ["queued", "running", "cancelling", ...terminalStates].map((state) =>
    `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`
  ).join("");

  const history = recentJobs.length
    ? `<ul>${recentJobs.map((job) => {
        const product = productById.get(job.product_id);
        const result = parseStoredJson(job.result_json, {});
        const evidence = parseStoredJson(job.evidence_json, []);
        const steps = Array.isArray(result.steps) ? result.steps : [];
        const targetLabel = result.targetMode === "pool" ? "automatic pool" : "exact device";
        const progress = result.progress?.stepId
          ? `<span>Current step: ${escapeHtml(result.progress.stepId)} | Completed steps: ${escapeHtml(result.progress.completedSteps || 0)}</span><br>`
          : "";
        const stepSummary = steps.length
          ? `<span>${steps.map((step) => `${escapeHtml(step.stepId)}: ${escapeHtml(step.status)}`).join(" | ")}</span>`
          : "<span>No completed step results yet.</span>";
        const retrySource = result.retryOfJobId
          ? `<br><span>Retry of <code>${escapeHtml(result.retryOfJobId)}</code></span>`
          : "";
        const controls = ["queued", "running"].includes(job.lease_state)
          ? `<button type="button" data-job-action="cancel" data-job-id="${escapeHtml(job.id)}">${job.lease_state === "running" ? "Request cancellation" : "Cancel queued job"}</button>`
          : terminalStates.has(job.lease_state)
            ? `<button type="button" data-job-action="retry" data-job-id="${escapeHtml(job.id)}">Retry as new job</button>`
            : "";
        return `<li data-history-job data-product="${escapeHtml(job.product_id)}" data-state="${escapeHtml(job.lease_state)}">
          <strong>${escapeHtml(product?.name || job.product_id)}</strong> | <strong>${escapeHtml(job.lease_state)}</strong> <a href="/testing-functions/jobs/${encodeURIComponent(job.id)}"><code>${escapeHtml(job.id)}</code></a><br>
          <span>Final result: ${escapeHtml(result.finalStatus || "pending")} | Target: ${escapeHtml(targetLabel)} | Runner: ${escapeHtml(job.runner_id)} | Device: ${escapeHtml(job.device_id)}</span><br>
          ${progress}${stepSummary}${retrySource}<br>
          <span>Evidence records: ${escapeHtml(Array.isArray(evidence) ? evidence.length : 0)} | Updated: ${escapeHtml(job.updated_at)}</span>
          ${controls ? `<p>${controls}</p>` : ""}
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No portfolio test jobs have been queued yet.</p>';

  return `<section class="grid">
    ${card("Run portfolio tests", `<form id="portfolio-test-form">
      <label>Runner ID <input name="runnerId" value="auto" required maxlength="80"></label>
      <label>Device ID <input name="deviceId" value="auto" required maxlength="80"></label>
      <fieldset><legend>Apps</legend>${productChoices}</fieldset>
      <button type="submit">Queue selected tests</button>
    </form>
    <p id="testing-status" aria-live="polite"></p>
    <p>Use <code>auto</code> for both IDs to assign each job to the first compatible idle device. Exact runner and device IDs remain available for hardware-specific work.</p>
    <p>The server supplies each app's package-bound steps. Batch requests cannot add commands or paths.</p>
    <script src="/testing-functions.js" defer></script>`)}
    ${card("Regression schedules", `<form id="testing-schedule-form">
      <label>Schedule name <input name="name" required maxlength="80" placeholder="Nightly portfolio regression"></label>
      <label>Runner ID <input name="runnerId" value="auto" required maxlength="80"></label>
      <label>Device ID <input name="deviceId" value="auto" required maxlength="80"></label>
      <label>Cadence
        <select name="cadenceMinutes">
          <option value="60">Hourly</option>
          <option value="360">Every 6 hours</option>
          <option value="1440" selected>Daily</option>
          <option value="10080">Weekly</option>
        </select>
      </label>
      <fieldset><legend>Apps</legend>${scheduleProductChoices}</fieldset>
      <button type="submit">Create schedule</button>
      <button type="button" data-run-due-schedules>Run due schedules now</button>
    </form>${scheduleMarkup}`)}
    ${card("Approved app tests", `<ul>${productCatalog}</ul>`)}
    ${card("Runner fleet", `${fleetMarkup}<p>Automatic jobs are claimed only by a runner advertising that app. Every runner-device pair can hold one active lease.</p><p>Online runners checked in within ${escapeHtml(Math.round(fleetStaleMs / 1000))} seconds; offline begins after ${escapeHtml(Math.round(fleetOfflineMs / 1000))} seconds.</p>`)}
    ${card("Portfolio job status", `<p>Queued: ${escapeHtml(counts.queued || 0)} | Running: ${escapeHtml(counts.running || 0)} | Cancelling: ${escapeHtml(counts.cancelling || 0)} | Completed: ${escapeHtml(counts.completed || 0)} | Needs attention: ${escapeHtml((counts.failed || 0) + (counts.blocked || 0) + (counts.interrupted || 0))} | Cancelled: ${escapeHtml(counts.cancelled || 0)}</p>
      <p>Runner heartbeats maintain active leases. Results refresh every 30 seconds while this page is idle.</p>`)}
    ${card("Recent test jobs", `<p>
      <label>App <select name="historyProduct"><option value="">All apps</option>${productFilterOptions}</select></label>
      <label>State <select name="historyState"><option value="">All states</option>${stateFilterOptions}</select></label>
    </p>${history}<p><a href="/testing-functions">Refresh results</a> | <a href="/automation">All automation jobs</a></p>`)}
    ${card("Execution boundary", `<p>APK identity is verified before the package-bound manifest runs. Automatic pooling selects a compatible idle device; exact targets remain pinned.</p>
      <p>Queued jobs cancel immediately. Running jobs enter <code>cancelling</code> until the runner stops the active child and reports completion.</p>`)}
  </section>`;
}


export function renderTestingJobPage({ product, job, evidenceObjects = [] }) {
  const steps = Array.isArray(job.result?.steps) ? job.result.steps : [];
  const evidence = Array.isArray(job.evidence) ? job.evidence : [];
  const stepMarkup = steps.length
    ? `<ul>${steps.map((step) => `<li><strong>${escapeHtml(step.stepId || "unknown")}</strong>: ${escapeHtml(step.status || "unknown")} | Exit: ${escapeHtml(step.exitCode ?? "n/a")}</li>`).join("")}</ul>`
    : '<p class="empty-state">No completed step results are available.</p>';
  const evidenceMarkup = evidence.length
    ? `<ul>${evidence.map((item) => `<li>${escapeHtml(item.stepId || "job")} | ${escapeHtml(item.type || "unknown")} | <code>${escapeHtml(item.ref || "")}</code></li>`).join("")}</ul>`
    : '<p class="empty-state">No evidence records are available.</p>';
  const hostedMarkup = evidenceObjects.length
    ? `<ul>${evidenceObjects.map((item) => `<li><a href="/testing-functions/jobs/${encodeURIComponent(job.id)}/evidence/${encodeURIComponent(item.id)}">${escapeHtml(item.artifact_name)}</a> | ${escapeHtml(item.step_id)} | ${escapeHtml(item.byte_size)} bytes | SHA-256 <code>${escapeHtml(item.sha256)}</code> | Retained until ${escapeHtml(item.retention_until)}</li>`).join("")}</ul>`
    : '<p class="empty-state">No hosted evidence is available.</p>';
  return `<section class="grid">
    ${card("Job summary", `<p><strong>${escapeHtml(product?.name || job.productId)}</strong></p>
      <p><code>${escapeHtml(job.id)}</code></p>
      <p>State: ${escapeHtml(job.state)} | Final result: ${escapeHtml(job.result?.finalStatus || "pending")}</p>
      <p>Runner: ${escapeHtml(job.runnerId)} | Device: ${escapeHtml(job.deviceId)}</p>
      <p>Created: ${escapeHtml(job.createdAt)} | Updated: ${escapeHtml(job.updatedAt)}</p>
      <p><a href="/testing-functions/jobs/${encodeURIComponent(job.id)}/result.json">Download result JSON</a> | <a href="/testing-functions/jobs/${encodeURIComponent(job.id)}/comparison.json">Compare with prior run</a> | <a href="/testing-functions">Back to Testing Functions</a></p>`)}
    ${card("Approved steps", `<p>${job.orderedSteps.map(escapeHtml).join(" | ") || "No steps recorded."}</p>`)}
    ${card("Step results", stepMarkup)}
    ${card("Evidence index", evidenceMarkup)}
    ${card("Hosted evidence", hostedMarkup)}
    ${card("Raw bounded result", `<pre><code>${escapeHtml(JSON.stringify(job.result, null, 2))}</code></pre>`)}
  </section>`;
}
