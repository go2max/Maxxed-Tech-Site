import { resolve } from "node:path";

import { DEFAULT_MAX_APK_BYTES, STATE_FILE } from "./constants.mjs";
import { loadProductConfig, loadScriptPackManifest, matchProduct } from "./catalog.mjs";
import { executeStep } from "./executor.mjs";
import { createAndroidSdkInspectionAdapter, inspectApk } from "./inspector.mjs";
import { acquireLeases, recoverInterruptedJobs, releaseLeases } from "./leases.mjs";
import { redactStepResult } from "./redaction.mjs";
import { writeReports } from "./reports.mjs";
import { RunnerStateStore } from "./state-store.mjs";

export async function runSequentialJob(options) {
  const store = new RunnerStateStore(options.stateDir, STATE_FILE);
  const inspectionAdapter =
    options.inspectionMode === "production"
      ? (options.inspectionAdapter || createAndroidSdkInspectionAdapter({ aaptPath: options.aaptPath }))
      : null;
  const inspection = await inspectApk(options.apkPath, {
    maxBytes: options.maxApkBytes || DEFAULT_MAX_APK_BYTES,
    mode: options.inspectionMode || "test",
    adapter: inspectionAdapter,
  });
  const productConfig = await loadProductConfig(options.productsConfigPath);
  const product = matchProduct(productConfig, inspection.metadata.packageName);
  const { manifest, manifestPath } = await loadScriptPackManifest({
    rootDir: options.rootDir,
    product,
    requestedManifestPath: options.scriptPackManifestPath,
    allowTestManifest: Boolean(options.allowTestManifest),
  });

  const selectedSteps = options.stepIds.map((stepId) => {
    const match = manifest.steps.find((step) => step.id === stepId);
    if (!match) throw new Error("step_not_allowlisted");
    return match;
  });

  const jobId = `job-${crypto.randomUUID()}`;
  await recoverInterruptedJobs(store);
  await acquireLeases(store, options.runnerId, options.deviceId, jobId, options.leaseDurationMs || 15 * 60 * 1000);
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
    await releaseLeases(store, jobId, finalStatus);
  }

  const report = {
    jobId,
    product: product.slug,
    packageName: inspection.metadata.packageName,
    manifestPath,
    sha256: inspection.sha256,
    finalStatus,
    steps,
  };
  await writeReports(resolve(options.reportDir), report);
  return report;
}
