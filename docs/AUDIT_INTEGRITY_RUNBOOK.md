# Audit Integrity Runbook

1. Export the current audit events.
2. Run the audit-chain verification test or equivalent verification script.
3. If integrity fails, stop administrative mutations and restore from the last verified backup.
4. Record the incident and the recovered audit boundary.
