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

export function renderTestingFunctionsPage({ jobs = [] } = {}) {
  const recentJobs = [...jobs]
    .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))
    .slice(0, 10);
  const history = recentJobs.length
    ? `<ul>${recentJobs.map((job) => {
        const result = parseStoredJson(job.result_json, {});
        const evidence = parseStoredJson(job.evidence_json, []);
        const steps = Array.isArray(result.steps) ? result.steps : [];
        const stepSummary = steps.length
          ? `<span>${steps.map((step) => `${escapeHtml(step.stepId)}: ${escapeHtml(step.status)}`).join(" | ")}</span>`
          : "<span>No step results yet.</span>";
        return `<li>
          <strong>${escapeHtml(job.lease_state)}</strong> <code>${escapeHtml(job.id)}</code><br>
          <span>Runner: ${escapeHtml(job.runner_id)} | Device: ${escapeHtml(job.device_id)}</span><br>
          ${stepSummary}<br>
          <span>Evidence records: ${escapeHtml(evidence.length)} | Updated: ${escapeHtml(job.updated_at)}</span>
        </li>`;
      }).join("")}</ul>`
    : '<p class="empty-state">No Maxxed Remote test jobs have been queued yet.</p>';

  return `<section class="grid">
    ${card("Maxxed Remote", `<p><strong>Full UX, discovery, and TV connection test</strong></p>
      <p>Approved steps: <code>artifact-verify</code>, <code>launch-smoke</code>, <code>full-ux-connection</code></p>
      <form id="remote-test-form">
        <label>Runner ID <input name="runnerId" value="local-windows-runner" required maxlength="80"></label>
        <label>Device ID <input name="deviceId" value="android-device-1" required maxlength="80"></label>
        <button type="submit">Queue full test</button>
      </form>
      <p id="remote-test-status" aria-live="polite"></p>
      <p>Real television pairing, power, reconnect, and response require operator observation.</p>
      <script src="/testing-functions.js" defer></script>`)}
    ${card("Recent Remote jobs", `${history}<p><a href="/testing-functions">Refresh results</a> | <a href="/automation">All automation jobs</a></p>`)}
    ${card("Runner boundary", `<p>The server owns the ordered step list. The browser cannot submit commands, executable paths, or shell arguments.</p>
      <p>The queued job waits for the isolated Windows runner and selected Android device.</p>`)}
  </section>`;
}
