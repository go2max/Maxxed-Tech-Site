import test from "node:test";
import assert from "node:assert/strict";

import { buildRegressionComparison } from "../src/testing/regression.mjs";

function job(id, productId, steps, finalStatus = "pass") {
  return {
    id,
    productId,
    state: finalStatus === "pass" ? "completed" : "failed",
    result: { finalStatus, steps },
  };
}

test("regression comparison classifies failures, fixes, and unchanged steps", () => {
  const baseline = job("job-before", "maxxed-remote", [
    { stepId: "artifact-verify", status: "pass", exitCode: 0 },
    { stepId: "launch-smoke", status: "fail", exitCode: 1 },
    { stepId: "ux-inventory", status: "pass", exitCode: 0 },
  ], "fail");
  const current = job("job-after", "maxxed-remote", [
    { stepId: "artifact-verify", status: "pass", exitCode: 0 },
    { stepId: "launch-smoke", status: "pass", exitCode: 0 },
    { stepId: "ux-inventory", status: "fail", exitCode: 2 },
  ], "fail");
  const comparison = buildRegressionComparison(current, baseline);
  assert.deepEqual(comparison.regressions.map((item) => item.stepId), ["ux-inventory"]);
  assert.deepEqual(comparison.improvements.map((item) => item.stepId), ["launch-smoke"]);
  assert.equal(comparison.summary.unchanged, 1);
  assert.equal(comparison.summary.comparedSteps, 3);
});

test("regression comparison rejects cross-product baselines", () => {
  assert.throws(() => buildRegressionComparison(
    job("current", "maxxed-remote", []),
    job("baseline", "rival-rush", []),
  ), /invalid_regression_jobs/);
});
