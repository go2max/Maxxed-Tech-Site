import { pathToFileURL } from "node:url";

process.on("message", async (message) => {
  try {
    const runnerModule = await import(pathToFileURL(message.modulePath).href);
    const result = await runnerModule.run({
      reportDir: message.context.reportDir,
      inspection: message.context.inspection,
      deviceId: message.context.deviceId,
      step: message.step,
      signal: AbortSignal.timeout ? AbortSignal.timeout(message.step.timeoutSeconds * 1000) : undefined,
    });
    process.send?.({ ok: true, result }, () => process.exit(0));
  } catch (error) {
    process.send?.({ ok: false, error: error.message }, () => process.exit(1));
  }
});
