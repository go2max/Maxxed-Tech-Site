const siteTargets = [
  ["techmaxxed", "TechMaxxed", "https://techmaxxed.com/", "Maxxed Technical Systems", "support@techmaxxed.com"],
  ["norcal-cash-for-cars", "NorCal Cash For Cars", "https://norcalcashforcars.com/", "NorCal", "support@techmaxxed.com"],
  ["maxxed-pix", "Maxxed Pix", "https://maxxedpix.com/", "Maxxed", "support@techmaxxed.com"],
  ["bunch-signing", "A. Bunch Mobile Notary", "https://bunchsigning.com/", "Bunch", "support@bunchsigning.com"],
];

const productTargets = [
  ["maxxed-remote", "Maxxed Remote", "https://techmaxxed.com/apps/maxxed-remote/", "https://techmaxxed.com/apps/maxxed-remote/privacy/", "Maxxed Remote"],
  ["maxxed-compass", "Maxxed Compass", "https://techmaxxed.com/apps/maxxed-compass/", "https://techmaxxed.com/apps/maxxed-compass/privacy/", "Maxxed Compass"],
  ["maxxed-measure", "Maxxed Measure", "https://techmaxxed.com/apps/maxxed-measure/", "https://techmaxxed.com/apps/maxxed-measure/privacy/", "Maxxed Measure"],
  ["fishing-maxxed", "Fishing Maxxed", "https://techmaxxed.com/apps/fishing-maxxed/", "https://techmaxxed.com/apps/fishing-maxxed/privacy/", "Fishing Maxxed"],
  ["rival-rush", "Rival Rush", "https://techmaxxed.com/apps/rival-rush/", "https://techmaxxed.com/apps/rival-rush/privacy/", "Rival Rush"],
];

async function timedFetch(url, marker) {
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "MaxxedAdminLiveReport/1.0" },
    });
    const text = await response.text();
    const markerFound = marker ? text.toLowerCase().includes(String(marker).toLowerCase()) : true;
    const status = response.ok && markerFound ? "pass" : response.ok ? "warn" : "fail";
    return { status, url, httpStatus: response.status, responseMs: Date.now() - started, markerFound, checkedAt };
  } catch (error) {
    return {
      status: "fail",
      url,
      httpStatus: null,
      responseMs: Date.now() - started,
      markerFound: false,
      checkedAt,
      error: error?.name === "AbortError" ? "request_timeout" : "request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSite([id, label, url, marker, expectedSupport]) {
  return { id, label, expectedSupport, ...await timedFetch(url, marker) };
}

async function checkProduct([id, label, publicUrl, privacyUrl, marker]) {
  const [publicPage, privacyPage] = await Promise.all([
    timedFetch(publicUrl, marker),
    timedFetch(privacyUrl, "Privacy"),
  ]);
  const blockers = [];
  if (publicPage.status === "fail") blockers.push("public_page_unavailable");
  if (publicPage.status === "warn") blockers.push("public_page_marker_missing");
  if (privacyPage.status === "fail") blockers.push("privacy_page_unavailable");
  if (privacyPage.status === "warn") blockers.push("privacy_page_marker_missing");
  return { id, label, status: blockers.length ? "warn" : "pass", publicPage, privacyPage, blockers };
}

function integration(env, key, label) {
  const value = String(env?.[key] || "").trim();
  return {
    id: key.toLowerCase(),
    label,
    status: value ? "configured" : "not_connected",
    source: value ? "environment" : "missing_environment_variable",
    checkedAt: new Date().toISOString(),
  };
}

function summarize(sites, products, integrations) {
  const blockers = [
    ...sites.filter((site) => site.status === "fail").map((site) => `${site.label}: site_unavailable`),
    ...products.flatMap((product) => product.blockers.map((blocker) => `${product.label}: ${blocker}`)),
  ];
  const warnings = sites.filter((site) => site.status === "warn").length + products.filter((product) => product.status === "warn").length;
  return {
    status: blockers.length ? "action_required" : warnings ? "review" : "pass",
    sitesOnline: sites.filter((site) => site.status !== "fail").length,
    sitesTotal: sites.length,
    productsPassing: products.filter((product) => product.status === "pass").length,
    productsTotal: products.length,
    integrationsConnected: integrations.filter((item) => item.status === "configured").length,
    integrationsTotal: integrations.length,
    blockers,
  };
}

export async function buildLiveOperationsReport({ env = {} } = {}) {
  const [sites, products] = await Promise.all([
    Promise.all(siteTargets.map(checkSite)),
    Promise.all(productTargets.map(checkProduct)),
  ]);
  const integrations = [
    integration(env, "GITHUB_ACTIONS_HEALTH_URL", "GitHub Actions health"),
    integration(env, "PLAY_CONSOLE_HEALTH_URL", "Google Play Console health"),
    integration(env, "MAILBOX_HEALTH_URL", "Support mailbox health"),
    integration(env, "CLOUDFLARE_ACCESS_HEALTH_URL", "Cloudflare Access health"),
    integration(env, "RUNNER_HEALTH_URL", "Local Android runner health"),
  ];
  return {
    source: "live",
    generatedAt: new Date().toISOString(),
    summary: summarize(sites, products, integrations),
    sites,
    products,
    integrations,
  };
}
