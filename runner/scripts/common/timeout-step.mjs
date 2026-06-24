export async function run({ signal }) {
  const startedAt = new Date().toISOString();
  await new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("step_timeout")), { once: true });
  });
  return { status: "fail", stdout: "", stderr: "timeout", evidence: [], startedAt, endedAt: new Date().toISOString() };
}
