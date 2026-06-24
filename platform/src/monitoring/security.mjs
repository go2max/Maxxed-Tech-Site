const OPEN_FINDING_STATES = new Set(["open", "acknowledged", "investigating"]);
const ACTIVE_INTEGRATION_STATES = new Set(["current", "healthy", "pass"]);

function ageMs(timestamp, now) {
  const parsed = Date.parse(timestamp || "");
  return Number.isFinite(parsed) ? Math.max(0, now - parsed) : Number.POSITIVE_INFINITY;
}

export function summarizeSecurityPosture({
  findings = [],
  integrations = [],
  backups = [],
  auditValid = null,
  now = Date.now(),
  integrationStaleMs = 24 * 60 * 60 * 1000,
  backupStaleMs = 48 * 60 * 60 * 1000,
} = {}) {
  const openFindings = findings.filter((finding) => OPEN_FINDING_STATES.has(finding.status));
  const criticalFindings = openFindings.filter((finding) => finding.severity === "critical");
  const highFindings = openFindings.filter((finding) => finding.severity === "high");
  const integrationStates = integrations.map((integration) => {
    const automaticStale = ageMs(integration.updated_at, now) > integrationStaleMs;
    const reported = integration.freshness_state;
    const state = automaticStale && ACTIVE_INTEGRATION_STATES.has(reported)
      ? "stale"
      : reported;
    return {
      id: integration.id,
      name: integration.monitor_name,
      productId: integration.product_id,
      state,
      updatedAt: integration.updated_at,
    };
  });
  const unhealthyIntegrations = integrationStates.filter((item) => !ACTIVE_INTEGRATION_STATES.has(item.state));
  const availableBackups = backups.filter((backup) => backup.storage_state !== "deleted")
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
  const latestBackup = availableBackups[0] || null;
  const backupHealthy = Boolean(
    latestBackup &&
    latestBackup.storage_state === "verified" &&
    ageMs(latestBackup.verified_at || latestBackup.created_at, now) <= backupStaleMs
  );
  const critical = auditValid === false || criticalFindings.length > 0;
  const degraded = highFindings.length > 0 || unhealthyIntegrations.length > 0 || !backupHealthy || auditValid == null;
  return {
    state: critical ? "critical" : degraded ? "degraded" : "healthy",
    auditValid,
    openFindingCount: openFindings.length,
    criticalFindingCount: criticalFindings.length,
    highFindingCount: highFindings.length,
    unhealthyIntegrationCount: unhealthyIntegrations.length,
    integrations: integrationStates,
    latestBackup,
    backupHealthy,
  };
}

export function normalizeFindingFingerprint(value) {
  const fingerprint = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._:-]{5,199}$/.test(fingerprint)) {
    throw new Error("invalid_security_finding_fingerprint");
  }
  return fingerprint;
}
