import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const pagePath = resolve(root, "public/tools/web-launch-qa-pro/index.html");
const fixturePath = resolve(root, "tools/web-launch-qa-pro/fixtures/example-report.md");

const page = await readFile(pagePath, "utf8");
const fixture = await readFile(fixturePath, "utf8");

const requiredPageSnippets = [
  "Web Launch QA Pro",
  "support@techmaxxed.com",
  "https://techmaxxed.com/tools/web-launch-qa-pro/",
  "data-weight=\"8\"",
  "copyReport",
  "downloadReport",
  "Load example",
  "Privacy, terms, and accessibility pages exist",
  "Build/check command passes locally or in CI",
  "Web Launch QA Pro Report",
];

const missing = requiredPageSnippets.filter((snippet) => !page.includes(snippet));
if (missing.length) {
  console.error("Missing required Web Launch QA Pro page snippets:");
  for (const snippet of missing) console.error(`- ${snippet}`);
  process.exit(1);
}

const checkboxCount = (page.match(/data-weight="/g) || []).length;
if (checkboxCount !== 16) {
  console.error(`Expected 16 weighted checklist items, found ${checkboxCount}.`);
  process.exit(1);
}

const weights = [...page.matchAll(/data-weight="(\d+)"/g)].map((match) => Number(match[1]));
const total = weights.reduce((sum, value) => sum + value, 0);
if (total !== 100) {
  console.error(`Expected checklist weights to total 100, found ${total}.`);
  process.exit(1);
}

const requiredFixtureSnippets = ["Score:", "Completed checks", "Remaining checks", "TechMaxxed product page launch pass"];
const missingFixture = requiredFixtureSnippets.filter((snippet) => !fixture.includes(snippet));
if (missingFixture.length) {
  console.error("Missing required Web Launch QA Pro fixture snippets:");
  for (const snippet of missingFixture) console.error(`- ${snippet}`);
  process.exit(1);
}

console.log(`Web Launch QA Pro validation passed with ${checkboxCount} checks and ${total} total points.`);
