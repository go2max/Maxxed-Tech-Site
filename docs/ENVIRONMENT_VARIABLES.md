# Environment Variables

The following values are required by the private platform or runner and should be provided through local or hosted secret management.

- `APP_ENV`: `development` or `production`
- `SESSION_SECRET`: signed session-cookie secret
- `ALLOW_DEV_IDENTITY_OVERRIDE`: `true` only for explicit local development
- `TRUSTED_IDENTITY_EMAIL_HEADER`: trusted proxy header name
- `TRUSTED_IDENTITY_SUBJECT_HEADER`: trusted proxy header name
- `TRUSTED_IDENTITY_NAME_HEADER`: trusted proxy header name
- `MAX_REQUEST_BYTES`: request-size limit for private routes

Example values in this repository are non-secret placeholders only.
