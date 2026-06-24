import { resolve } from "node:path";

export async function executeStep(step, context) {
  const modulePath = resolve(context.rootDir, step.commandRef);
  const runnerModule = await import(`file://${modulePath.replaceAll('\\', '/')}`);
  const timeoutMs = step.timeoutSeconds * 1000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("step_timeout")), timeoutMs);

  try {
    const result = await runnerModule.run({ ...context, signal: controller.signal, step });
    return {
      stepId: step.id,
      required: !step.continueOnFailure,
      exitCode: result.exitCode ?? 0,
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      evidence: result.evidence ?? [],
      startedAt: result.startedAt,
      endedAt: result.endedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}
