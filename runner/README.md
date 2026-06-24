# Maxxed Sequential APK Runner

The runner is a local Windows-first tool for dry runs and sequential APK test
jobs. Approved script-pack manifests are bound to public application package
IDs, executed in isolated child processes, and protected by cross-process lease
state. Production signing keys and service credentials never belong in Git or
on runner machines.

## Claim One Admin Job

Set the runner token through local secret management, then run one claim cycle:

```powershell

node runner/remote-cli.mjs `
  --platform=https://admin.techmaxxed.com `
  --apk=C:\builds\maxxed-remote.apk `
  --products=C:\maxxed-runner\products.json `
  --manifest=runner\config\script-packs\maxxed-remote\manifest.json `
  --stateDir=C:\maxxed-runner\state `
  --reportDir=C:\maxxed-runner\reports `
  --runnerId=local-windows-runner `
  --deviceId=android-device-1 `
  --inspectionMode=production `
  --aaptPath=C:\Android\build-tools\35.0.0\aapt.exe
```

The client claims only a job assigned to the exact runner and device, executes
its server-approved steps sequentially, and returns a bounded result and
evidence index. A 404 claim response means the runner is idle.

## Persistent Agent

Create `runner/config/agent.local.json` from `agent.example.json`, configure
the APK, Android SDK, runner, and device paths, and provide
`MAXXED_RUNNER_API_TOKEN` through Windows secret management. Validate every
required local file before starting:

```powershell
node runner/agent.mjs --config=runner/config/agent.local.json --check
```

Then start:

```powershell
node runner/agent.mjs --config=runner/config/agent.local.json
```

The agent awaits each child process before polling again, so one runner never
executes two jobs concurrently. Successful or idle cycles use `pollSeconds`;
failed cycles use `errorBackoffSeconds`. `Ctrl+C` or a service stop signal
terminates the active child and exits cleanly.

The local config, product mapping, APKs, state, reports, and credentials are
intentionally excluded from source control. A production service or Scheduled
Task should run under a dedicated non-administrator Windows account.

See `docs/MAXXED_REMOTE_OPERATIONS.md` for deployment, job-state, recovery,
and credential-rotation procedures.
