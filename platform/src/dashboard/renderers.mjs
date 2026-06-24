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

export function renderTestingFunctionsPage({ products = [], jobs = [] } = {}) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const recentJobs = [...jobs]
    .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))
    .slice(0, 50);
  const counts = jobs.reduce((summary, job) => {
    summary[job.lease_state] = (summary[job.lease_state] || 0) + 1;
    return summary;
  }, {});
  const terminalStates = new Set(["completed", "failed", "blocked", "interrupted", "cancelled"]);
  const productChoices = products.map((product) => `
    <label><input type="checkbox" name="productId" value="${escapeHtml(product.id)}"> ${escapeHtml(product.name)}</label>
  `).join("");
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
          <strong>${escapeHtml(product?.name || job.product_id)}</strong> | <strong>${escapeHtml(job.lease_state)}</strong> <code>${escapeHtml(job.id)}</code><br>
          <span>Final result: ${escapeHtml(result.finalStatus || "pending")} | Runner: ${escapeHtml(job.runner_id)} | Device: ${escapeHtml(job.device_id)}</span><br>
          ${progress}${stepSummary}${retrySource}<br>
          <span>Evidence records: ${escapeHtml(Array.isArray(evidence) ? evidence.length : 0)} | Updated: ${escapeHtml(job.updated_at)}</span>
          ${controls ? `<p>${controls}</p>` : ""}
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No portfolio test jobs have been queued yet.</p>';

  return `<section class="grid">
    ${card("Run portfolio tests", `<form id="portfolio-test-form">
      <label>Runner ID <input name="runnerId" value="local-windows-runner" required maxlength="80"></label>
      <label>Device ID <input name="deviceId" value="android-device-1" required maxlength="80"></label>
      <fieldset><legend>Apps</legend>${productChoices}</fieldset>
      <button type="submit">Queue selected tests</button>
    </form>
    <p id="testing-status" aria-live="polite"></p>
    <p>The server supplies each app's package-bound steps. Batch requests cannot add commands or paths.</p>
    <script src="/testing-functions.js" defer></script>`)}
    ${card("Approved app tests", `<ul>${productCatalog}</ul>`)}
    ${card("Portfolio job status", `<p>Queued: ${escapeHtml(counts.queued || 0)} | Running: ${escapeHtml(counts.running || 0)} | Cancelling: ${escapeHtml(counts.cancelling || 0)} | Completed: ${escapeHtml(counts.completed || 0)} | Needs attention: ${escapeHtml((counts.failed || 0) + (counts.blocked || 0) + (counts.interrupted || 0))} | Cancelled: ${escapeHtml(counts.cancelled || 0)}</p>
      <p>Runner heartbeats maintain active leases. Results refresh every 30 seconds while this page is idle.</p>`)}
    ${card("Recent test jobs", `<p>
      <label>App <select name="historyProduct"><option value="">All apps</option>${productFilterOptions}</select></label>
      <label>State <select name="historyState"><option value="">All states</option>${stateFilterOptions}</select></label>
    </p>${history}<p><a href="/testing-functions">Refresh results</a> | <a href="/automation">All automation jobs</a></p>`)}
    ${card("Execution boundary", `<p>APK identity is verified before the package-bound manifest runs. Tests execute sequentially on one selected Android device.</p>
      <p>Queued jobs cancel immediately. Running jobs enter <code>cancelling</code> until the runner stops the active child and reports completion.</p>`)}
  </section>`;
}

