function nowIso(now) {
  return new Date(now).toISOString();
}

function markInterruptedJob(state, now) {
  if (!state.activeJob) return state;
  state.jobs = state.jobs.map((job) => (
    job.jobId === state.activeJob
      ? { ...job, status: "interrupted", finishedAt: nowIso(now), interruptionReason: "stale_lease_recovered" }
      : job
  ));
  state.activeJob = null;
  state.deviceLease = null;
  state.runnerLease = null;
  return state;
}

function isLeaseActive(lease, now) {
  return lease && Date.parse(lease.expiresAt) > now;
}

export async function recoverInterruptedJobs(store, now = Date.now()) {
  return store.transact((state) => {
    if (!isLeaseActive(state.deviceLease, now) || !isLeaseActive(state.runnerLease, now)) {
      return markInterruptedJob(state, now);
    }
    return state;
  });
}

export async function acquireLeases(store, runnerId, deviceId, jobId, leaseDurationMs, now = Date.now()) {
  return store.transact((state) => {
    if (!isLeaseActive(state.deviceLease, now) || !isLeaseActive(state.runnerLease, now)) {
      markInterruptedJob(state, now);
    }
    if (state.activeJob || state.deviceLease || state.runnerLease) {
      throw new Error("lease_contention");
    }
    const expiresAt = nowIso(now + leaseDurationMs);
    state.activeJob = jobId;
    state.deviceLease = { deviceId, jobId, acquiredAt: nowIso(now), expiresAt };
    state.runnerLease = { runnerId, jobId, acquiredAt: nowIso(now), expiresAt };
    state.jobs.push({ jobId, runnerId, deviceId, status: "running", startedAt: nowIso(now) });
    return state;
  });
}

export async function releaseLeases(store, jobId, finalStatus, now = Date.now()) {
  return store.transact((state) => {
    state.activeJob = null;
    state.deviceLease = null;
    state.runnerLease = null;
    state.jobs = state.jobs.map((job) => (
      job.jobId === jobId
        ? { ...job, status: finalStatus, finishedAt: nowIso(now) }
        : job
    ));
    return state;
  });
}
