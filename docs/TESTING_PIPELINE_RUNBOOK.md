# Private Testing Pipeline Runbook

## Hosted Admin Configuration

The private `platform/` Sites project requires:

- D1 binding `DB` with both committed migrations applied in order.
- R2 binding `ARTIFACTS` for private APK and evidence objects.
- `ADMIN_ALLOWED_EMAILS`, a comma-separated list of approved administrators.
- `RUNNER_TOKEN`, a long random secret shared only with runner machines.
- Optional `MAX_APK_BYTES`, capped by the Worker at 250,000,000 bytes.

Do not expose the runner token in browser JavaScript, source control, task
arguments, screenshots, or logs. Configure identity protection for the entire
admin hostname and deny access when the email allowlist is absent.

## Windows Runner Setup

Install PowerShell 7, Android SDK Platform Tools, `apkanalyzer`, `apksigner`,
and the required Android device drivers. Connect and authorize one test device.
Set the token as a user or machine environment variable:

```powershell
[Environment]::SetEnvironmentVariable(
  'MAXXED_RUNNER_TOKEN',
  '<secret from hosted environment>',
  'User'
)
```

Run the one-command readiness diagnostic before installing the agent:

```powershell
pwsh -File runner\agent\Test-MaxxRunnerSetup.ps1 `
  -BaseUrl https://admin.techmaxxed.com `
  -DeviceSerial <adb-serial>
```

Configure approved certificate SHA-256 digests on the runner as JSON. A valid
but unconfigured signer produces manual review; a configured mismatch fails
before installation.

```powershell
[Environment]::SetEnvironmentVariable(
  'MAXXED_ALLOWED_SIGNERS_JSON',
  '{"maxxed-remote":["<sha256>"],"rival-rush":["<sha256>"]}',
  'User'
)
```

Validate one polling cycle interactively:

```powershell
pwsh -File runner\agent\maxxed-runner-agent.ps1 `
  -BaseUrl https://admin.techmaxxed.com `
  -DeviceSerial <adb-serial> `
  -Once
```

After a successful interactive run, install the current-user scheduled task:

```powershell
pwsh -File runner\agent\install-runner-task.ps1 `
  -BaseUrl https://admin.techmaxxed.com `
  -DeviceSerial <adb-serial>
```

## Acceptance Test

1. Upload an APK under the correct app in Admin > Testing Functions.
2. Confirm the displayed SHA-256 matches a local `Get-FileHash` result.
3. Queue one launch script and confirm the runner leases it.
4. Confirm the device cannot be leased by a second runner during the job.
5. Confirm step status, screenshots, logs, package metadata, signer evidence,
   memory output, JSON, and HTML appear in the job.
6. Queue multiple scripts and confirm their selected order is preserved.
7. Stop the runner during a disposable test and confirm the expired job becomes
   interrupted rather than passed.
8. Run physical/manual suites and confirm they remain manual review until an
   operator records real-device observations.

Production signing keys are neither required nor permitted on runner machines.
Use test or release artifacts supplied through the private artifact store.
