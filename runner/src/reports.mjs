import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1>${body}</main></body></html>`;
}

export async function writeReports(reportDir, report) {
  await mkdir(reportDir, { recursive: true });
  await writeFile(resolve(reportDir, `${report.jobId}.json`), JSON.stringify(report, null, 2));
  const body = `<p>Final status: ${report.finalStatus}</p><ul>${report.steps.map((step) => `<li>${step.stepId}: ${step.status}</li>`).join("")}</ul>`;
  await writeFile(resolve(reportDir, `${report.jobId}.html`), page(`Runner report ${report.jobId}`, body));
}
