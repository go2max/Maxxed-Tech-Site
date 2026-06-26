import { normalizeRoles } from './rbac.mjs';

const accessEmailHeaders = [
  'cf-access-authenticated-user-email',
  'Cf-Access-Authenticated-User-Email',
  'x-authenticated-user-email',
  'X-Authenticated-User-Email'
];

export function readHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) || headers.get(name.toLowerCase());
  return headers[name] || headers[name.toLowerCase()];
}

export function identityFromHeaders(headers, env = process.env) {
  const email = accessEmailHeaders.map((name) => readHeader(headers, name)).find(Boolean);
  if (email) {
    const roleHeader = readHeader(headers, 'x-maxxed-admin-roles') || readHeader(headers, 'X-MAXXED-ADMIN-ROLES') || '';
    return {
      email: String(email).toLowerCase(),
      roles: normalizeRoles(roleHeader || env.ADMIN_DEFAULT_ROLES || 'Analytics Viewer'),
      source: 'access_headers'
    };
  }

  if (env.ADMIN_ALLOW_MOCK_IDENTITY === 'true') {
    if (env.ADMIN_ENV === 'production') {
      throw new Error('ADMIN_ALLOW_MOCK_IDENTITY must not be enabled in production');
    }
    return {
      email: String(env.ADMIN_MOCK_EMAIL || 'owner@techmaxxed.com').toLowerCase(),
      roles: normalizeRoles(env.ADMIN_MOCK_ROLES || 'Owner'),
      source: 'local_mock'
    };
  }

  return null;
}
