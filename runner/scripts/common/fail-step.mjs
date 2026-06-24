export async function run({ step }) {
  const startedAt = new Date().toISOString();
  const endedAt = new Date().toISOString();
  return {
    status: "fail",
    stdout: "",
    stderr: `${step.id} failed with token=runner-secret`,
    evidence: [],
    startedAt,
    endedAt,
  };
}
