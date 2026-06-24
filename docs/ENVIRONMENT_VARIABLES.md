# Environment Variables

The following values are required by the private platform or runner and should be provided through local or hosted secret management.

- `APP_ENV`: `development` or `production`
- `SESSION_SECRET`: strong session-cookie secret, minimum 32 characters
- `ALLOW_DEV_IDENTITY_OVERRIDE`: `true` only for explicit local development
- `TRUSTED_IDENTITY_JWT_HEADER`: identity assertion header, default `cf-access-jwt-assertion`
- `TRUSTED_IDENTITY_AUDIENCE`: expected Access JWT audience
- `TRUSTED_IDENTITY_ISSUER`: expected Access JWT issuer
- `TRUSTED_IDENTITY_JWT_ALGORITHM`: JWT signature algorithm; `HS256` is test-only and production requires `RS256`
- `TRUSTED_IDENTITY_JWT_KEY`: RS256 public verification key in production or an HS256 secret in tests
- `TRUSTED_IDENTITY_EMAIL_HEADER`: trusted proxy header name
- `TRUSTED_IDENTITY_SUBJECT_HEADER`: trusted proxy header name
- `TRUSTED_IDENTITY_NAME_HEADER`: trusted proxy header name
- `MAX_REQUEST_BYTES`: request-size limit for private routes
- `AUTH_RATE_LIMIT_MAX`: maximum authentication attempts per rate-limit window
- `AUTH_RATE_LIMIT_WINDOW_MS`: authentication rate-limit window in milliseconds
- `MUTATION_RATE_LIMIT_MAX`: maximum mutations per rate-limit window
- `MUTATION_RATE_LIMIT_WINDOW_MS`: mutation rate-limit window in milliseconds
- `PLATFORM_DB`: Cloudflare D1 binding name for the private platform
- `ANDROID_AAPT_PATH`: local Android SDK `aapt` path when using production APK inspection mode

Example values in this repository are non-secret placeholders only.
