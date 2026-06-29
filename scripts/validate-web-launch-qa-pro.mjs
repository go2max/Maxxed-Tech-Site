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
  "copyReport",
  "downloadReport",
  "exportJson",
  "importJson",
  "printReport",
  "localStorage",
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

const itemMatches = [...page.matchAll(/\['([^']+)',\s*(\d+),\s*'([^']+)'\]/g)];
if (itemMatches.length !== 16) {
  console.error(`Expected 16 checklist definitions, found ${itemMatches.length}.`);
  process.exit(1);
}

const weights = itemMatches.map((match) => Number(match[2]));
const total = weights.reduce((sum, value) => sum + value, 0);
if (total !== 100) {
  console.error(`Expected checklist weights to total 100, found ${total}.`);
  process.exit(1);
}

const labels = itemMatches.map((match) => match[1]);
const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
if (duplicates.length) {
  console.error(`Duplicate checklist labels found: ${duplicates.join(", ")}`);
  process.exit(1);
}

const requiredFixtureSnippets = ["Score:", "Completed checks", "Remaining checks", "TechMaxxed product page launch pass"];
const missingFixture = requiredFixtureSnippets.filter((snippet) => !fixture.includes(snippet));
if (missingFixture.length) {
  console.error("Missing required Web Launch QA Pro fixture snippets:");
  for (const snippet of missingFixture) console.error(`- ${snippet}`);
  process.exit(1);
}

console.log(`Web Launch QA Pro validation passed with ${itemMatches.length} checks and ${total} total points.`);
