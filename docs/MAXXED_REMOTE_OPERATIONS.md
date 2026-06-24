# Maxxed Remote Test Operations

This runbook covers the private admin-to-runner workflow for the full Maxxed
Remote UX, discovery, and television connection test.

## Production Checklist

1. Deploy the private platform with Cloudflare Access, D1, and the environment
   values listed in `docs/ENVIRONMENT_VARIABLES.md`.
2. Generate the runner bearer token in secret management. Store the platform
   copy as `RUNNER_API_TOKEN` and the Windows runner copy as
   `MAXXED_RUNNER_API_TOKEN`. Never place either value in a config file,
   command line, task definition, report, or repository.
3. Copy `runner/config/agent.example.json` to
   `runner/config/agent.local.json` on the runner and set absolute local
   paths for the APK, product map, script-pack manifest, report directory,
   state directory, Android device, and Android SDK tool.
4. Run the preflight before starting the persistent process:

   ```powershell
   node runner/agent.mjs --config=runner/config/agent.local.json --check
   ```

5. Run the agent under a dedicated non-administrator Windows account:

   ```powershell
   node runner/agent.mjs --config=runner/config/agent.local.json
   ```

6. Confirm that the agent logs `runner_agent_started` and that no token or
   authorization header appears in the output.

## Admin Workflow

1. Open **Testing Functions** as a QA Lead or Owner.
2. Confirm the runner and Android device IDs exactly match the local agent.
3. Select **Queue full test**. The server always supplies the approved step
   order; browser input cannot add commands or executable paths.
4. Watch **Remote job status**. The page refreshes every 30 seconds while it is
   visible and idle.
5. Review the final state, step outcomes, evidence count, runner, device, and
   update timestamp.
6. Treat `blocked` as a required hardware observation, not as a successful
   automated connection test.

A queued job can be cancelled before a runner claims it. A terminal job can be
retried; retry creates a new job and keeps the original result and audit trail.
Running jobs enter `cancelling`. The next runner heartbeat terminates the
active isolated step and records a terminal `cancelled` result.

## Job States

- `queued`: waiting for the exact runner and device
- `running`: claimed and executing sequentially
- `cancelling`: stop requested and awaiting runner acknowledgement
- `completed`: all required automated work passed
- `failed`: one or more required checks failed
- `blocked`: physical television observation or unavailable hardware blocked completion
- `interrupted`: the runner stopped unexpectedly
- `cancelled`: an operator cancelled the job before claim

Queued jobs cancel immediately. Running jobs transition through `cancelling`.
Only terminal states can be retried. Invalid transitions return HTTP `409` and
do not mutate the job.

## Recovery

### Job Remains Queued

- Verify the agent process is running.
- Verify the IDs in the local config match the queued job.
- Run `--check` again to detect a missing APK, manifest, product map, or
  configured Android SDK tool.
- Confirm the runner can reach the private platform over HTTPS.
- Confirm the runner token copies still match; rotate both copies together.

### Job Is Interrupted or Failed

- Preserve the local JSON report, screenshots, and logcat evidence.
- Correct the local artifact, device, SDK, or network condition.
- Use **Retry as new job** so the failed record remains available.

### Job Is Blocked

- Connect compatible television hardware on the same approved network.
- Perform the required pairing and response observation.
- Run the direct PowerShell command documented in
  `docs/MAXXED_REMOTE_ADMIN_TEST.md` when hardware-specific parameters are
  required.
- Do not mark hardware behavior as passed without direct observation.

## Security Boundaries

- The browser supplies only runner and device identifiers.
- The server owns the ordered test steps.
- The package-bound manifest owns command references.
- The runner uses argument arrays with no shell interpolation.
- Runner credentials are read only from local secret management.
- Job creation, claim, completion, cancellation, and retry are audited.
- Cancellation and retry require `qa.assign`, a valid session, same-origin
  request validation, and CSRF validation.

## Validation

Before merging or deploying changes, run:

```powershell
npm run check
node scripts/security-scan.mjs
```

GitHub Actions runs the same repository checks on Windows for pushes and pull
requests.


Portfolio-wide setup and lease behavior are documented in
`docs/PORTFOLIO_TESTING_CONTROL_PLANE.md`.
