export async function run({ step }) {
  const startedAt = new Date().toISOString();
  const endedAt = new Date().toISOString();
  return {
    status: "pass",
    stdout: `${step.id} completed`,
    stderr: "",
    evidence: [{ type: "stdout", ref: step.id }],
    startedAt,
    endedAt,
  };
}
