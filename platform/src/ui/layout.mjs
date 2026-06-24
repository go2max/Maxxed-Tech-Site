function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderShell({ title, identity, content, csrfToken }) {
  const developmentBanner = identity.isDevelopmentOverride
    ? `<div class="banner">Development identity override active for ${escapeHtml(identity.email)}</div>`
    : "";
  const roles = identity.roles.map((role) => `<li>${escapeHtml(role)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    :root { color-scheme: light; --ink:#122033; --bg:#eef3f7; --panel:#ffffff; --accent:#0f5a7a; --warn:#9c6b00; }
    body { margin:0; font-family: "Segoe UI", Tahoma, sans-serif; background: linear-gradient(180deg, #dce8ef 0%, #eef3f7 100%); color:var(--ink); }
    header, main { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .banner { background:#fff4d1; border:1px solid #e7c160; padding:12px 16px; border-radius:12px; margin-bottom:16px; color:var(--warn); font-weight:600; }
    .hero { background:var(--panel); border-radius:20px; padding:24px; box-shadow: 0 12px 32px rgba(18,32,51,0.08); }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top:16px; }
    .card { background:var(--panel); border-radius:16px; padding:18px; box-shadow: 0 10px 24px rgba(18,32,51,0.06); }
    code { background:#e6eef4; padding:2px 6px; border-radius:6px; }
    nav { display:flex; flex-wrap:wrap; gap:12px; margin-top:16px; }
    nav a { color:var(--accent); font-weight:600; }
  </style>
</head>
<body>
  <header>
    ${developmentBanner}
    <div class="hero">
      <p>Private Maxxed Operations Platform</p>
      <h1>${escapeHtml(title)}</h1>
      <p>Signed in as <strong>${escapeHtml(identity.displayName)}</strong> with trusted identity <code>${escapeHtml(identity.email)}</code>.</p>
      <ul>${roles}</ul>
      <nav aria-label="Admin sections"><a href="/portfolio">Portfolio</a><a href="/testing-functions">Testing Functions</a><a href="/automation">Automation jobs</a></nav>
      <p>CSRF token issued for protected actions: <code data-csrf-token>${escapeHtml(csrfToken)}</code></p>
    </div>
  </header>
  <main>${content}</main>
</body>
</html>`;
}

