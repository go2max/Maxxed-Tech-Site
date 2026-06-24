# Maxxed Platform Threat Model

Last updated: June 23, 2026

## Scope

This threat model covers the repository-controlled public website, the planned
private operations platform, and the local sequential APK runner.

## Primary Assets

- Administrative identity and role assignments
- Product, build, release, QA, beta, incident, and knowledge-base records
- Audit history and integrity proofs
- APK artifacts, hashes, signing metadata, and evidence outputs
- Integration credentials and service identities
- Tester contact details, consent state, and limited device metadata

## Threats and Required Mitigations

| Threat | Risk | Required mitigations |
| --- | --- | --- |
| Identity spoofing | Unauthorized administrative access | Trust identity only from server-side proxy headers, reject browser-supplied role claims, require explicit local development override disabled by default |
| Privilege escalation | Over-broad access or owner-only action abuse | Deny-by-default RBAC, server-side permission checks, separation of duties, audit every role change |
| CSRF | Cross-site state changes | Per-session CSRF tokens, strict origin checks, same-site cookies, reject unsafe cross-origin methods |
| XSS | Session theft or action forgery | Output encoding, strict CSP, no inline user HTML, safe templates, reject unsafe rich text |
| SQL injection | Data compromise or privilege bypass | Prepared statements only, schema validation, transactional service boundaries |
| SSRF | Abuse of integration clients or internal network access | Destination allowlists, no operator-controlled arbitrary URLs, bounded HTTP clients |
| Malicious APK intake | Runner compromise or unsafe installation | Parse APK without execution, size limits, ZIP validation, signer/package checks, no arbitrary unpack-and-run |
| Arbitrary script execution | Host compromise from operator input | Versioned allowlisted script catalog only, immutable selected script IDs, no shell text from browser or upload |
| Artifact leakage | Exposure of APKs, logs, screenshots, or private data | Private storage, least-privilege access, redaction, minimal retention, no secrets in reports |
| Runner compromise | Device abuse or lateral movement | Dedicated non-admin runner account, limited egress, no production keys, device leases, cleanup and interruption handling |
| Replay attacks | Duplicate or stale administrative actions | Request IDs, CSRF, session expiry, idempotency checks for sensitive workflows where applicable |
| Queue races | Parallel execution on one runner/device | Single-job runner lock, device lease lock, ordered step persistence, concurrency tests |
| Audit tampering | Loss of trustworthy history | Append-only audit writes, integrity hash chaining, no update/delete path in normal services |
| Secret exposure | Credential theft via UI or logs | Redacted logs, no secrets in browser responses, safe examples only in docs, secret scanning in hardening |

## Data Handling Principles

- Unavailable external data must be displayed as unavailable or stale, never as
  fabricated success or zero.
- Production signing material must never be placed on runners.
- Beta tester access consent and public-credit consent must remain separate.
- Public site content and private operational data must remain on separate
  deployment surfaces.
