# Credential Rotation Runbook

1. Rotate the secret in hosted secret storage.
2. Redeploy the affected service without exposing the prior value.
3. Invalidate cached sessions or tokens if the credential scope requires it.
4. Record the rotation in the audit log and implementation status.
