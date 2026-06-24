# Automatic Device Pools

Testing Functions supports two execution targets:

- `auto` / `auto`: any compatible idle runner-device pair may claim the job.
- an exact runner ID and device ID: only that pair may claim the job.

Mixed targets are rejected. A job cannot use an automatic runner with a pinned
device, or a pinned runner with an automatic device.

## Capability routing

Each runner advertises its configured product IDs on every claim and heartbeat.
An automatic job is eligible only when its product appears in that capability
list. The server supplies the immutable package-bound steps; runner capability
claims cannot add products, commands, or paths outside the approved catalog.

Exact eligible jobs take priority over automatic jobs for the same device. Within
each target class, the oldest compatible queued job is selected.

## Capacity guarantee

A runner-device pair can own at most one `running` or `cancelling` job. A second
claim receives HTTP 409 `runner_capacity_conflict:device_busy`. Claim assignment,
device ownership, and the audit event commit together. Concurrent D1 claims retry
on audit-head contention and recheck capacity before committing.

The persistent Windows agent already executes one cycle at a time. The server
capacity rule remains authoritative if two agent processes are accidentally
started for the same device.

## Scheduling and retries

Regression schedules should normally use `auto` for both target fields. Scheduled
jobs then spread across compatible devices as they become available. Hardware-
specific acceptance tests should use exact IDs.

After an automatic job is assigned, its result metadata retains `targetMode`,
`assignedRunnerId`, `assignedDeviceId`, and `assignedAt`. Retrying that terminal
job returns it to the automatic pool. Retrying an exact-target job preserves its
exact target.

## Operations

Runner fleet health remains visible in Testing Functions. Offline devices cannot
claim work, so automatic jobs remain queued until a compatible runner checks in.
If a device stops heartbeating during active work, the existing lease expiry path
marks the job interrupted before that device can claim another job.

Use unique per-runner credentials and follow
`docs/RUNNER_FLEET_OPERATIONS.md` for rotation and incident response. Never use
`auto` as an actual runner or device identity in agent configuration.
