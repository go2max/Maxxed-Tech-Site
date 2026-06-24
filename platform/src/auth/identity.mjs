import { createHmac, createPublicKey, timingSafeEqual, verify as verifySignature } from "node:crypto";

import { permissionsForRoles } from "./roles.mjs";

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  return {
    encodedHeader,
    encodedPayload,
    encodedSignature,
    signingInput: `${encodedHeader}.${encodedPayload}`,
    header: decodeJwtPart(encodedHeader),
    payload: decodeJwtPart(encodedPayload),
    signature: Buffer.from(encodedSignature, "base64url"),
  };
}

function verifyHs256(parsed, key) {
  const expected = createHmac("sha256", key).update(parsed.signingInput).digest();
  return expected.length === parsed.signature.length && timingSafeEqual(expected, parsed.signature);
}

function verifyRs256(parsed, key) {
  return verifySignature("RSA-SHA256", Buffer.from(parsed.signingInput), createPublicKey(key), parsed.signature);
}

function verifyJwtSignature(parsed, key, algorithm) {
  if (parsed.header.alg !== algorithm) return false;
  if (algorithm === "HS256") return verifyHs256(parsed, key);
  if (algorithm === "RS256") return verifyRs256(parsed, key);
  throw new Error(`unsupported_jwt_algorithm:${algorithm}`);
}

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

function validateJwtClaims(payload, config, nowSeconds) {
  if (!payload?.email || typeof payload.email !== "string") throw new Error("missing_identity_email");
  if (!payload?.sub || typeof payload.sub !== "string") throw new Error("missing_identity_subject");
  if (payload.iss !== config.trustedIdentityIssuer) throw new Error("invalid_identity_issuer");

  const audience = payload.aud;
  const validAudience =
    audience === config.trustedIdentityAudience
    || (Array.isArray(audience) && audience.includes(config.trustedIdentityAudience));
  if (!validAudience) throw new Error("invalid_identity_audience");

  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) throw new Error("expired_identity_jwt");
  if (payload.nbf && payload.nbf > nowSeconds) throw new Error("identity_jwt_not_yet_valid");
}

function deriveIdentityFromJwt(parsed, config, accessStore, nowSeconds) {
  validateJwtClaims(parsed.payload, config, nowSeconds);

  const email = parsed.payload.email.toLowerCase();
  const subject = parsed.payload.sub;
  const displayName = parsed.payload.name || parsed.payload.email;
  const roles = accessStore.getRolesForEmail(email);
  const permissions = permissionsForRoles(roles);

  return {
    email,
    subject,
    displayName,
    source: "trusted-jwt",
    roles,
    permissions,
    isDevelopmentOverride: false,
  };
}

function validateMirroredHeaders(request, config, identity) {
  const mirroredEmail = request.headers.get(config.trustedIdentityEmailHeader);
  const mirroredSubject = request.headers.get(config.trustedIdentitySubjectHeader);
  const mirroredName = request.headers.get(config.trustedIdentityNameHeader);

  if (mirroredEmail && mirroredEmail.toLowerCase() !== identity.email) {
    throw new Error("identity_header_mismatch");
  }
  if (mirroredSubject && mirroredSubject !== identity.subject) {
    throw new Error("identity_header_mismatch");
  }
  if (mirroredName && mirroredName !== identity.displayName) {
    throw new Error("identity_header_mismatch");
  }
}

export function extractTrustedIdentity(request, config, accessStore, now = Date.now()) {
  const jwtAssertion = request.headers.get(config.trustedIdentityJwtHeader);

  if (jwtAssertion) {
    const parsed = parseJwt(jwtAssertion);
    if (!parsed) throw new Error("invalid_identity_jwt");
    if (!verifyJwtSignature(parsed, config.trustedIdentityJwtKey, config.trustedIdentityJwtAlgorithm)) {
      throw new Error("invalid_identity_jwt_signature");
    }
    const identity = deriveIdentityFromJwt(parsed, config, accessStore, Math.floor(now / 1000));
    validateMirroredHeaders(request, config, identity);
    return identity;
  }

  if (config.allowDevelopmentIdentityOverride) {
    const rawIdentity = parseDevIdentity(request.headers.get("x-maxxed-dev-identity") || "");
    if (!rawIdentity) return null;
    const roles = accessStore.getRolesForEmail(rawIdentity.email);
    return {
      ...rawIdentity,
      roles,
      permissions: permissionsForRoles(roles),
      isDevelopmentOverride: true,
    };
  }

  return null;
}
