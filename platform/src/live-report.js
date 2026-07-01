const reportHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

const siteTargets = [
  {
    id: "techmaxxed",
    label: "TechMaxxed",
    url: "https://techmaxxed.com/",
    expectedText: "Maxxed Technical Systems",
    expectedSupport: "support@techmaxxed.com"
  },
  {
    id: "norcal-cash-for-cars",
    label: "NorCal Cash For Cars",
    url: "https://norcalcashforcars.com/",
    expectedText: "NorCal",
    expectedSupport: "support@techmaxxed.com"
  },
  {
    id: "maxxed-pix",
    label: "Maxxed Pix",
    url: "https://maxxedpix.com/",
    expectedText: "Maxxed",
    expectedSupport: "support@techmaxxed.com"
  },
  {
    id: "bunch-signing",
    label: "A. Bunch Mobile Notary",
    url: "https://bunchsigning.com/",
    expectedText: "Bunch",
    expectedSupport: "support@bunchsigning.com"
  }
];

const productTargets = [
  {
    id: "maxxed-remote",
    label: "Maxxed Remote",
    publicUrl: "https://techmaxxed.com/apps/maxxed-remote/",
    privacyUrl: "https://techmaxxed.com/apps/maxxed-remote/privacy/",
    expectedText: "Maxxed Remote"
  },
  {
    id: "maxxed-compass",
    label: "Maxxed Compass",
    publicUrl: "https://techmaxxed.com/apps/maxxed-compass/",
    privacyUrl: "https://techmaxxed.com/apps/maxxed-compass/privacy/",
    expectedText: "Maxxed Compass"
  },
  {
    id: "maxxed-measure",
    label: "Maxxed Measure",
    publicUrl: "https://techmaxxed.com/apps/maxxed-measure/",
    privacyUrl: "https://techmaxxed.com/apps/maxxed-measure/privacy/",
    expectedText: "Maxxed Measure"
  },
  {
    id: "fishing-maxxed",
    label: "Fishing Maxxed",
    publicUrl: "https://techmaxxed.com/apps/fishing-maxxed/",
    privacyUrl: "https://techmaxxed.com/apps/fishing-maxxed/privacy/",
    expectedText: "Fishing Maxxed"
  },
  {
    id: "rival-rush",
    label: "Rival Rush",
    publicUrl: "https://techmaxxed.com/apps/rival-rush/",
    privacyUrl: "https://techmaxxed.com/apps/rival-rush/privacy/",
    expectedText: "Rival Rush"
  }
];

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: reportHeaders });
}

function baseStatus(ok, markerFound) {
  if (ok && markerFound) return "pass";
  if (ok) return "warn";
  return "fail";
}

async function timedFetch(target, expectedText) {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "MaxxedAdminLiveReport/1.0"
      }
    });
    const elapsedMs = Date.now() - started;
    const text = await response.text();
    const markerFound = expectedText ? text.toLowerCase().includes(expectedText.toLowerCase()) : true;
    return {
      status: baseStatus(response.ok, markerFound),
      url: target,
      httpStatus: response.status,
      responseMs: elapsedMs,
      markerFound,
      contentLength: text.length,
      checkedAt
    };
  } catch (error) {
    return {
      status: "fail",
      url: target,
      httpStatus: null,
      responseMs: Date.now() - started,
      markerFound: false,
      contentLength: 0,
      checkedAt,
      error: error?.name === "AbortError" ? "Request timed out" : "Request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSite(target) {
  const result = await timedFetch(target.url, target.expectedText);
  return {
    id: target.id,
    label: target.label,
    expectedSupport: target.expectedSupport,
    ...result
  };
}

async function checkProduct(target) {
  const [publicPage, privacyPage] = await Promise.all([
    timedFetch(target.publicUrl, target.expectedText),
    timedFetch(target.privacyUrl, "Privacy")
  ]);
  const blockers = [];
  if (publicPage.status === "fail") blockers.push("Public product page is unavailable.");
  if (publicPage.status === "warn") blockers.push("Public product page loaded but expected product text was not found.");
  if (privacyPage.status === "fail") blockers.push("Privacy page is unavailable.");
  if (privacyPage.status === "warn") blockers.push("Privacy page loaded but privacy marker text was not found.");
  return {
    id: target.id,
    label: target.label,
    status: blockers.length ? "warn" : "pass",
    publicPage,
    privacyPage,
    blockers
  };
}

function integrationState(env, key, label) {
  const enabled = String(env[key] || "").trim();
  return {
    id: key.toLowerCase(),
    label,
    status: enabled ? "pass" : "not_connected",
    source: enabled ? "environment" : "environment variable missing",
    checkedAt: new Date().toISOString()
  };
}

function summarize(sites, products, integrations) {
  const siteFailures = sites.filter((site) => site.status === "fail").length;
  const siteWarnings = sites.filter((site) => site.status === "warn").length;
  const productIssues = products.filter((product) => product.status !== "pass").length;
  const disconnected = integrations.filter((integration) => integration.status === "not_connected").length;
  const blockers = [
    ...sites.filter((site) => site.status === "fail").map((site) => `${site.label} is unavailable.`),
    ...products.flatMap((product) => product.blockers.map((blocker) => `${product.label}: ${blocker}`))
  ];
  return {
    status: blockers.length ? "action_required" : siteWarnings || productIssues || disconnected ? "review" : "pass",
    sitesOnline: sites.filter((site) => site.status !== "fail").length,
    sitesTotal: sites.length,
    siteFailures,
    siteWarnings,
    productsPassing: products.filter((product) => product.status === "pass").length,
    productsTotal: products.length,
    productIssues,
    integrationsConnected: integrations.filter((integration) => integration.status === "pass").length,
    integrationsTotal: integrations.length,
    disconnectedIntegrations: disconnected,
    blockers
  };
}

export async function liveReport(env = {}) {
  const generatedAt = new Date().toISOString();
  const [sites, products] = await Promise.all([
    Promise.all(siteTargets.map(checkSite)),
    Promise.all(productTargets.map(checkProduct))
  ]);
  const integrations = [
    integrationState(env, "GITHUB_ACTIONS_HEALTH_URL", "GitHub Actions health"),
    integrationState(env, "PLAY_CONSOLE_HEALTH_URL", "Google Play Console health"),
    integrationState(env, "MAILBOX_HEALTH_URL", "Support mailbox health"),
    integrationState(env, "CLOUDFLARE_ACCESS_HEALTH_URL", "Cloudflare Access health"),
    integrationState(env, "RUNNER_HEALTH_URL", "Local Android runner health")
  ];
  return {
    source: "live",
    generatedAt,
    summary: summarize(sites, products, integrations),
    sites,
    products,
    integrations
  };
}

export async function handleLiveReport(_request, env) {
  return json(await liveReport(env));
}
