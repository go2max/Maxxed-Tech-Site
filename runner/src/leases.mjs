export async function acquireLeases(store, runnerId, deviceId, jobId) {
  return store.transact((state) => {
    if (state.activeJob || state.deviceLease || state.runnerLease) {
      throw new Error("lease_contention");
    }
    state.activeJob = jobId;
    state.deviceLease = { deviceId, jobId };
    state.runnerLease = { runnerId, jobId };
    return state;
  });
}

export async function releaseLeases(store) {
  return store.transact((state) => {
    state.activeJob = null;
    state.deviceLease = null;
    state.runnerLease = null;
    return state;
  });
}
