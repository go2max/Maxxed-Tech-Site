import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pagePath = resolve(root, "public/tools/web-launch-qa-pro/index.html");
const fixturePath = resolve(root, "tools/web-launch-qa-pro/fixtures/example-report.md");
const page = await readFile(pagePath, "utf8");
const fixture = await readFile(fixturePath, "utf8");

const requiredPageSnippets = [
  "Web Launch QA Pro",
  "support@techmaxxed.com",
  "techmaxxed.com/tools/web-launch-qa-pro",
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

const labels = [
  "Unique title and meta description on key pages",
  "Canonical, robots.txt, and sitemap are launch-safe",
  "Open Graph/social preview is present",
  "Structured data is valid where applicable",
  "Primary call to action is visible above the fold",
  "Every major page has clear support/contact access",
  "Thin placeholder copy removed",
  "Mobile layout reviewed on narrow screens",
  "Privacy, terms, and accessibility pages exist",
  "Business/support email is correct",
  "Images and icons have meaningful alt or decorative handling",
  "Keyboard focus and contrast pass a basic manual check",
  "404 page and broken-link check are clean",
  "Build/check command passes locally or in CI",
  "Analytics/measurement decision is documented",
  "Final owner approval captured",
];

const missingLabels = labels.filter((label) => !page.includes(label));
if (missingLabels.length) {
  console.error("Missing checklist labels:");
  for (const label of missingLabels) console.error(`- ${label}`);
  process.exit(1);
}

const weights = [8, 8, 4, 5, 8, 6, 7, 7, 7, 5, 5, 6, 8, 8, 4, 4];
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

console.log(`Web Launch QA Pro validation passed with ${labels.length} checks and ${total} total points.`);
