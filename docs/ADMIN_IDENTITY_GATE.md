# Admin Production Identity Gate

The admin platform must trust only identity-aware proxy headers supplied by Cloudflare Access or an equivalent proxy.

Rules:
- Production requires a trusted authenticated email header.
- Allowed domains are explicit.
- Mismatched mirrored identity headers fail closed.
- Mock identity is forbidden in production.
