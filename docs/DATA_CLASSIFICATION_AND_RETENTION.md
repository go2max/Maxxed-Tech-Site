# Data Classification and Retention Matrix

Last updated: June 23, 2026

| Data class | Examples | Sensitivity | Default access | Retention guidance | Notes |
| --- | --- | --- | --- | --- | --- |
| Public content | Public site pages, product descriptions, public policies | Low | Public | Keep current published version and source history | No private admin data |
| Internal operational records | Products, builds, releases, readiness evidence, incidents, runbooks | Medium | Authorized staff only | Retain while operationally relevant plus audit needs | Avoid public exposure |
| Sensitive administrative records | Users, role assignments, security settings, session metadata | High | Owner/admin only by permission | Retain according to security and legal obligations | Every mutation audited |
| Beta program personal data | Email, device model, app interests, consent timestamps | High | Beta Manager and narrowly authorized staff | Retain minimal testing window plus removal/export obligations | Separate from public credits |
| Public-credit data | Approved display names and categories | Low after consent | Public if consented | Retain until consent withdrawn or record removed | Separate from tester eligibility |
| APK artifacts and test evidence | APK hashes, signer metadata, screenshots, logs, reports | High | QA, release, and runner roles only | Retain by release and QA policy, purge temporary local outputs | Redact secrets and personal data |
| Audit events | Mutation records, denials, approval chain, integrity hashes | High | Security/owner/auditor roles | Long-lived or immutable retention by policy | Append-only |
| Integration metadata | Sync status, freshness, credential age, adapter errors | Medium | Authorized operations roles | Retain current and historical operational windows | Never store raw secret values in UI |
