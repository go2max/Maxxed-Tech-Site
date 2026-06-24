import { resolve } from "node:path";

import { DEFAULT_MAX_APK_BYTES, STATE_FILE } from "./constants.mjs";
import { loadProductConfig, loadScriptPackManifest, matchProduct } from "./catalog.mjs";
import { executeStep } from "./executor.mjs";
import { inspectApk } from "./inspector.mjs";
import { acquireLeases, releaseLeases } from "./leases.mjs";
import { redactStepResult } from "./redaction.mjs";
import { writeReports } from "./reports.mjs";
import { RunnerStateStore } from "./state-store.mjs";

export async function runSequentialJob(options) {
  const store = new RunnerStateStore(options.stateDir, STATE_FILE);
  const inspection = await inspectApk(options.apkPath, options.maxApkBytes || DEFAULT_MAX_APK_BYTES);
  const productConfig = await loadProductConfig(options.productsConfigPath);
  const product = matchProduct(productConfig, inspection.metadata.packageName);
  const manifest = await loadScriptPackManifest(options.scriptPackManifestPath);

  const selectedSteps = options.stepIds.map((stepId) => {
    const match = manifest.steps.find((step) => step.id === stepId);
    if (!match) throw new Error("step_not_allowlisted");
    return match;
  });

  const jobId = `job-${crypto.randomUUID()}`;
  await acquireLeases(store, options.runnerId, options.deviceId, jobId);
  const steps = [];
  let finalStatus = "pass";

  try {
    for (const step of selectedSteps) {
      const result = redactStepResult(await executeStep(step, {
        rootDir: options.rootDir,
        reportDir: options.reportDir,
        inspection,
      }));
      steps.push(result);
      if (result.status === "fail" && !step.continueOnFailure) {
        finalStatus = "fail";
        break;
      }
      if (result.status === "blocked") {
        finalStatus = "blocked";
        break;
      }
    }
  } catch (error) {
    finalStatus = error.message === "lease_contention" ? "blocked" : error.message === "step_timeout" ? "fail" : "interrupted";
    steps.push({ stepId: "runtime", status: finalStatus, stdout: "", stderr: error.message, evidence: [] });
  } finally {
    await releaseLeases(store);
  }

  const report = {
    jobId,
    product: product.slug,
    packageName: inspection.metadata.packageName,
    sha256: inspection.sha256,
    finalStatus,
    steps,
  };
  await writeReports(resolve(options.reportDir), report);
  return report;
}
