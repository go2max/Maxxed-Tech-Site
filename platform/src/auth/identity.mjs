import { permissionsForRoles } from "./roles.mjs";

function parseDevIdentity(value) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed?.email || typeof parsed.email !== "string") return null;
    return {
      email: parsed.email.toLowerCase(),
      subject: parsed.subject || parsed.email.toLowerCase(),
      displayName: parsed.displayName || parsed.email,
      source: "development-override",
    };
  } catch {
    return null;
  }
}

export function extractTrustedIdentity(request, config, accessStore) {
  const emailHeader = request.headers.get(config.trustedIdentityEmailHeader);
  const subjectHeader = request.headers.get(config.trustedIdentitySubjectHeader);

  let rawIdentity = null;
  if (emailHeader && subjectHeader) {
    rawIdentity = {
      email: emailHeader.toLowerCase(),
      subject: subjectHeader,
      displayName: request.headers.get(config.trustedIdentityNameHeader) || emailHeader,
      source: "trusted-proxy",
    };
  } else if (config.allowDevelopmentIdentityOverride) {
    rawIdentity = parseDevIdentity(request.headers.get("x-maxxed-dev-identity") || "");
  }

  if (!rawIdentity) return null;

  const roles = accessStore.getRolesForEmail(rawIdentity.email);
  const permissions = permissionsForRoles(roles);

  return {
    ...rawIdentity,
    roles,
    permissions,
    isDevelopmentOverride: rawIdentity.source === "development-override",
  };
}
