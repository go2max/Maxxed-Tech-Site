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

export function renderTestingFunctionsPage() {
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
      <p><a href="/automation">View sequential automation jobs</a></p>
      <script src="/testing-functions.js" defer></script>`)}
    ${card("Runner boundary", `<p>The server owns the ordered step list. The browser cannot submit commands, executable paths, or shell arguments.</p>
      <p>The queued job waits for the isolated Windows runner and selected Android device.</p>`)}
  </section>`;
}
