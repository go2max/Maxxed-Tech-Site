import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePage } from "./scanner.mjs";
import { buildLeadScannerReport, toCsv } from "./report.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const html = await readFile(join(root, "fixtures", "strong-local-business.html"), "utf8");
const page = parsePage("https://example.com/", html);
const report = buildLeadScannerReport(
  {
    seedUrl: "https://example.com/",
    origin: "https://example.com",
    pages: [page],
    errors: [],
  },
  {
    businessName: "A. Bunch Mobile Notary",
    phone: "916-555-1212",
    email: "hello@example.com",
    cityStateOrServiceArea: "Roseville",
  },
);

console.log(JSON.stringify(report, null, 2));
console.log("\nCSV\n");
console.log(toCsv(report));
