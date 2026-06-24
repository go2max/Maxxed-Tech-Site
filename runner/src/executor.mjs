import { fork } from "node:child_process";
import { resolve } from "node:path";

function buildRestrictedEnv() {
  const allowed = ["ComSpec", "PATH", "PATHEXT", "SystemRoot", "TEMP", "TMP", "WINDIR"];
  return Object.fromEntries(allowed.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : [])));
}

export async function executeStep(step, context) {
  const modulePath = resolve(context.rootDir, step.commandRef);
  const childRunnerPath = resolve(context.rootDir, "runner", "src", "step-child.mjs");
  const timeoutMs = step.timeoutSeconds * 1000;

  return new Promise((resolvePromise, reject) => {
    let settled = false;
    const child = fork(childRunnerPath, [], {
      cwd: context.rootDir,
      env: buildRestrictedEnv(),
      execArgv: [],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGKILL");
      reject(new Error("step_timeout"));
    }, timeoutMs);

    child.on("message", (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill();
      if (!message?.ok) {
        reject(new Error(message?.error || "step_failed"));
        return;
      }
      resolvePromise({
        stepId: step.id,
        required: !step.continueOnFailure,
        exitCode: message.result.exitCode ?? 0,
        status: message.result.status,
        stdout: message.result.stdout ?? "",
        stderr: message.result.stderr ?? "",
        evidence: message.result.evidence ?? [],
        startedAt: message.result.startedAt,
        endedAt: message.result.endedAt,
      });
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error("step_child_exit"));
        return;
      }
      reject(new Error("step_child_exit"));
    });

    child.send({
      modulePath,
      step,
      context: {
        reportDir: context.reportDir,
        inspection: context.inspection,
      },
    });
  });
}
