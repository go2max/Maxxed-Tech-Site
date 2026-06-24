# Persistent Access Directory

The private platform continues to trust authentication from Cloudflare Access or
another configured identity-aware proxy. D1 now supplies authorization roles for
each verified email on every protected request. The application does not store
passwords and browser-supplied role headers remain ignored.

## Bootstrap

Apply `platform/migrations/0005_persistent_access_directory.sql` before enabling
persistent authorization. Set `BOOTSTRAP_OWNER_EMAIL` to one verified company
identity for the initial production setup. Only that email receives temporary
Owner authorization while no active persistent Owner exists.

Sign in as the bootstrap identity, open `/users`, create the same email as an
active user, and grant it the Owner role. As soon as an active persistent Owner
exists, bootstrap authorization and nonproduction fallback roles stop applying.
Remove `BOOTSTRAP_OWNER_EMAIL` from the hosted environment after verifying a
second active Owner and recovery path.

Test and development environments retain the existing in-memory identities only
until an active persistent Owner exists. Production has no broad static fallback.

## Administration

Owners and Administrators can create users, activate or deactivate non-Owner
users, and grant approved roles. Only an Owner can grant, revoke, deactivate, or
reactivate an Owner identity. Administrators cannot elevate themselves or another
user to Owner.

Role changes are append-only grant/revoke events. The effective role is the most
recent event for each user and role. User status and roles are read from D1 on
every request, so deactivation and revocation affect the next request even when a
previous session cookie remains valid.

## Safety

- Unknown roles are rejected.
- Duplicate grants, absent-role revocations, and unchanged statuses are rejected.
- The last active Owner cannot be revoked or deactivated.
- Inactive users receive no roles.
- Every user, status, grant, and revoke mutation is audit logged.
- Authentication remains external and MFA-capable; D1 controls authorization only.

## Recovery

Maintain at least two active Owners. If all Owners become inaccessible because of
an external identity-provider incident, recover the identity provider first. If
D1 data is damaged, restore the access tables from a verified backup. Do not
temporarily insert browser role headers or weaken JWT validation.

Emergency database changes must be recorded in an incident and followed by an
equivalent audit note after access is restored. Rotate the bootstrap configuration
off again after recovery.
