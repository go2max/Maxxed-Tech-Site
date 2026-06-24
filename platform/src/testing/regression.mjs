function stepsById(job) {
  const steps = Array.isArray(job?.result?.steps) ? job.result.steps : [];
  return new Map(steps
    .filter((step) => step && typeof step.stepId === "string")
    .map((step) => [step.stepId, {
      status: String(step.status || "unknown"),
      exitCode: step.exitCode ?? null,
    }]));
}

function successful(status) {
  return status === "pass";
}

export function buildRegressionComparison(current, baseline) {
  if (!current || !baseline || current.productId !== baseline.productId) {
    throw new Error("invalid_regression_jobs");
  }
  const currentSteps = stepsById(current);
  const baselineSteps = stepsById(baseline);
  const stepIds = [...new Set([...baselineSteps.keys(), ...currentSteps.keys()])].sort();
  const changes = stepIds.map((stepId) => {
    const before = baselineSteps.get(stepId) || { status: "not_run", exitCode: null };
    const after = currentSteps.get(stepId) || { status: "not_run", exitCode: null };
    const classification = successful(before.status) && !successful(after.status)
      ? "regression"
      : !successful(before.status) && successful(after.status)
        ? "improvement"
        : before.status === after.status && before.exitCode === after.exitCode
          ? "unchanged"
          : "changed";
    return { stepId, before, after, classification };
  });
  const regressions = changes.filter((item) => item.classification === "regression");
  const improvements = changes.filter((item) => item.classification === "improvement");
  return {
    productId: current.productId,
    currentJobId: current.id,
    baselineJobId: baseline.id,
    currentState: current.state,
    baselineState: baseline.state,
    currentFinalStatus: current.result?.finalStatus || current.state,
    baselineFinalStatus: baseline.result?.finalStatus || baseline.state,
    regressions,
    improvements,
    changes,
    summary: {
      comparedSteps: changes.length,
      regressions: regressions.length,
      improvements: improvements.length,
      changed: changes.filter((item) => item.classification === "changed").length,
      unchanged: changes.filter((item) => item.classification === "unchanged").length,
    },
  };
}
