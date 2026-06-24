function wait(milliseconds, signal) {
  return new Promise((resolvePromise) => {
    if (signal?.aborted) {
      resolvePromise();
      return;
    }
    const timeout = setTimeout(resolvePromise, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolvePromise();
    }, { once: true });
  });
}

export async function runHeartbeatLoop({
  heartbeat,
  intervalMs,
  stopSignal,
  cancel,
  maximumFailures = 3,
}) {
  let consecutiveFailures = 0;
  let beats = 0;
  while (!stopSignal?.aborted) {
    await wait(intervalMs, stopSignal);
    if (stopSignal?.aborted) break;
    try {
      const record = await heartbeat();
      beats += 1;
      consecutiveFailures = 0;
      if (record?.lease_state === "cancelling") {
        cancel("server_cancellation_requested");
        break;
      }
    } catch {
      consecutiveFailures += 1;
      if (consecutiveFailures >= maximumFailures) {
        cancel("lease_heartbeat_failed");
        break;
      }
    }
  }
  return { beats, consecutiveFailures };
}
