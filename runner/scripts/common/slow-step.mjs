export async function run({ step }) {
  const startedAt = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const endedAt = new Date().toISOString();
  return {
    status: "pass",
    stdout: `${step.id} completed slowly`,
    stderr: "",
    evidence: [],
    startedAt,
    endedAt,
  };
}
