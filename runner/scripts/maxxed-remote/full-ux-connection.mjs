import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./maxxed-remote-full-test.ps1", import.meta.url));

export async function run({ reportDir, inspection, step, signal }) {
  const startedAt = new Date().toISOString();
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-ApkPath",
    inspection.absolutePath,
    "-OutputDirectory",
    reportDir,
  ];

  try {
    const { stdout, stderr } = await execFileAsync("pwsh", args, {
      windowsHide: true,
      shell: false,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    return result("pass", stdout, stderr, startedAt, reportDir);
  } catch (error) {
    const exitCode = Number(error.code);
    if (exitCode === 2) {
      return result("blocked", error.stdout || "", error.stderr || "Physical TV review is required.", startedAt, reportDir, exitCode);
    }
    return result("fail", error.stdout || "", error.stderr || error.message, startedAt, reportDir, Number.isFinite(exitCode) ? exitCode : 1);
  }
}

function result(status, stdout, stderr, startedAt, reportDir, exitCode = 0) {
  return {
    status,
    exitCode,
    stdout,
    stderr,
    evidence: [
      { type: "result-json", ref: `${reportDir}/result.json` },
      { type: "logcat", ref: `${reportDir}/logcat.txt` },
      { type: "memory", ref: `${reportDir}/meminfo.txt` },
      { type: "screenshots", ref: reportDir },
    ],
    startedAt,
    endedAt: new Date().toISOString(),
  };
}
