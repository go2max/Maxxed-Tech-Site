# Regression Scheduling

The private Testing Functions console can persist repeatable test schedules for
one or more approved portfolio apps. Every dispatch creates the same
package-bound ordered jobs used by manual queueing; schedules cannot add command
paths or arbitrary test steps.

## Configure

Create a schedule from `/testing-functions` with:

- a descriptive name;
- one or more approved apps;
- the target runner and device IDs;
- a cadence from 15 minutes through 7 days.

New schedules are enabled immediately. Operators with `qa.assign` can pause,
resume, or run all due schedules. Resuming an overdue schedule makes it due now.

## Worker cron

`platform/worker.mjs` exports both `fetch` and `scheduled` handlers. Configure a
Cloudflare scheduled trigger at an interval no longer than the shortest active
schedule. A 15-minute trigger is suitable for all supported cadences. The
scheduled handler uses the internal `testing-scheduler@system.internal` service
identity and does not accept an HTTP credential.

Do not expose a public cron endpoint. The authenticated `Run due schedules now`
button is the recovery control when a trigger was unavailable.

## Dispatch guarantees

- At most 20 due schedules are handled per invocation.
- A schedule and all of its jobs are committed in one database transaction.
- The next deadline advances directly to the first interval after dispatch time,
  even if the schedule was overdue by months.
- Every schedule dispatch and generated automation job is audited.
- A second invocation sees the advanced deadline and does not duplicate jobs.
- Existing runner and device leases continue to enforce sequential execution.

## Regression results

A job detail page links to `comparison.json`. The platform selects the most
recent earlier terminal run for the same product and compares steps by ID.
A prior pass that no longer passes is a regression; a prior non-pass that now
passes is an improvement. Added, removed, and otherwise changed steps remain
visible without being mislabeled.

HTTP 404 with `missing_row:regression_baseline` means no earlier terminal run
exists for that product. Results use `Cache-Control: no-store`.

## Recovery

If a dispatch fails, verify D1 availability and audit integrity before retrying.
An atomic transaction prevents a partial schedule advance from being committed.
If a runner is offline, jobs remain queued and appear in the existing fleet and
job history views. Pause the schedule before manually clearing or retrying work.
