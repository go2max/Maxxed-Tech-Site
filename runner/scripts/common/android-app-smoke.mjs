import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./android-app-smoke.ps1", import.meta.url));

export async function run({ reportDir, inspection, step, deviceId, signal }) {
  const startedAt = new Date().toISOString();
  const mode = step.id === "ux-inventory" ? "Inventory" : "Launch";
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-ApkPath",
    inspection.absolutePath,
    "-PackageId",
    inspection.metadata.packageName,
    "-DeviceSerial",
    deviceId,
    "-OutputDirectory",
    reportDir,
    "-Mode",
    mode,
  ];

  try {
    const { stdout, stderr } = await execFileAsync("pwsh", args, {
      windowsHide: true,
      shell: false,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    return makeResult("pass", stdout, stderr, startedAt, reportDir, mode);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("job_cancelled");
    return makeResult(
      "fail",
      error.stdout || "",
      error.stderr || error.message,
      startedAt,
      reportDir,
      mode,
      Number.isFinite(Number(error.code)) ? Number(error.code) : 1,
    );
  }
}

function makeResult(status, stdout, stderr, startedAt, reportDir, mode, exitCode = 0) {
  const evidence = [
    { type: "screenshot", ref: `${reportDir}/screen.png` },
    { type: "logcat", ref: `${reportDir}/logcat.txt` },
  ];
  if (mode === "Inventory") {
    evidence.push(
      { type: "ui-hierarchy", ref: `${reportDir}/window.xml` },
      { type: "control-inventory", ref: `${reportDir}/controls.json` },
    );
  }
  return {
    status,
    exitCode,
    stdout,
    stderr,
    evidence,
    startedAt,
    endedAt: new Date().toISOString(),
  };
}
