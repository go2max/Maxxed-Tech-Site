import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { apps as siteApps } from "../content/site-data.mjs";
import { apps as testApps } from "../platform/src/catalog.js";

const root = resolve(import.meta.dirname, "..");
const argumentsMap = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value, all[index + 1]?.startsWith("--") ? true : all[index + 1] ?? true] : null).filter(Boolean));
const owners = String(argumentsMap.get("--owners") || "go2max,Maxxed-Technical-Systems").split(",").map((value) => value.trim()).filter(Boolean);
const inputPath = argumentsMap.get("--input") && argumentsMap.get("--input") !== true ? resolve(String(argumentsMap.get("--input"))) : null;
const outputDirectory = resolve(String(argumentsMap.get("--output") || resolve(root, "reports")));
const failOnUnmapped = argumentsMap.has("--fail-on-unmapped");
const token = process.env.GITHUB_TOKEN || "";
const repositoryClassifications = JSON.parse(await readFile(resolve(root, "content", "repository-classifications.json"), "utf8"));

const mappings = {
  "maxxed-remote": ["maxxed-remote", "tv-remote", "tv_remote", "remote-maxxed", "samsung-tv-remote"],
  "maxxed-compass": ["maxxed-compass", "maxxedcompass", "compass-maxxed"],
  "maxxed-measure": ["maxxed-measure", "maxxedmeasure", "measurement-maxxed", "measure-maxxed"],
  "maxxed-gold-estimator": ["maxxed-gold-estimator", "maxxedgoldestimator", "gold-estimator-maxxed", "gold-estimator"],
  "fishing-maxxed": ["fishing-maxxed", "fishingmaxxed", "maxxed-fishing"],
  "rival-rush": ["rival-rush", "rivalrush"]
};

const appTerms = /(^|[-_])(android|ios|mobile|app|game|remote|compass|measure|measurement|fishing|fish|gold|estimator|tracker|scanner|calculator|plugin|extension|wordpress)([-_]|$)/i;
const descriptionTerms = /\b(android|ios|mobile app|application|game|utility|plugin|extension|wordpress|play store)\b/i;
const excludedTerms = /(^|[-_])(sdk|module|modules|website|site|portfolio|archive|docs|assets|infrastructure|template|shared)([-_]|$)/i;
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function github(path) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "maxxed-app-inventory-audit", "x-github-api-version": "2022-11-28" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path} failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function fetchOwner(owner) {
  let ownerType = "users";
  try {
    const profile = await github(`/users/${encodeURIComponent(owner)}`);
    ownerType = profile.type === "Organization" ? "orgs" : "users";
  } catch {}
  const repositories = [];
  for (let page = 1; page <= 10; page++) {
    const path = ownerType === "orgs"
      ? `/orgs/${encodeURIComponent(owner)}/repos?type=all&sort=updated&per_page=100&page=${page}`
      : `/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated&per_page=100&page=${page}`;
    const batch = await github(path);
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return repositories;
}

function repoSummary(repo) {
  const fullName = repo.full_name || repo.repository || `${repo.owner?.login || repo.owner}/${repo.name}`;
  const [owner, name] = String(fullName).split("/");
  return {
    owner: repo.owner?.login || repo.owner || owner || "unknown",
    name: repo.name || name,
    fullName,
    url: repo.html_url || repo.url || (owner && name ? `https://github.com/${fullName}` : null),
    description: repo.description || [repo.family, repo.classification].filter(Boolean).join(" - "),
    language: repo.language || null,
    topics: repo.topics || [],
    archived: Boolean(repo.archived),
    private: Boolean(repo.private),
    fork: Boolean(repo.fork),
    updatedAt: repo.updated_at || repo.updatedAt || null,
    pushedAt: repo.pushed_at || null
  };
}

function matchApp(repo) {
  const haystack = normalize(`${repo.name} ${repo.description} ${(repo.topics || []).join(" ")}`);
  const matches = Object.entries(mappings).filter(([, aliases]) => aliases.some((alias) => haystack.includes(normalize(alias)))).map(([slug]) => slug);
  return matches.length === 1 ? matches[0] : matches.length ? matches : null;
}

function likelyApp(repo) {
  const name = normalize(repo.name);
  if (excludedTerms.test(name) && !matchApp(repo)) return false;
  return Boolean(matchApp(repo) || appTerms.test(name) || descriptionTerms.test(repo.description || "") || (repo.topics || []).some((topic) => appTerms.test(normalize(topic))));
}

let repositories;
if (inputPath) {
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  repositories = (Array.isArray(input) ? input : input.repositories || []).map(repoSummary);
} else {
  try {
    const batches = await Promise.all(owners.map(fetchOwner));
    repositories = batches.flat().map(repoSummary);
  } catch (error) {
    console.error(`GitHub inventory failed: ${error.message}`);
    console.error("Check network access, or rerun with --input path/to/repos.json using a saved repository inventory.");
    process.exit(2);
  }
}

const unique = new Map(repositories.map((repo) => [repo.fullName.toLowerCase(), repo]));
repositories = [...unique.values()].sort((left, right) => left.fullName.localeCompare(right.fullName));
const siteSlugs = siteApps.map((app) => app.slug).sort();
const testSlugs = testApps.map((app) => app.id).sort();
const siteOnly = siteSlugs.filter((slug) => !testSlugs.includes(slug));
const testOnly = testSlugs.filter((slug) => !siteSlugs.includes(slug));
const runnerMissing = testApps.filter((app) => app.scripts.some((script) => !script.commandRef)).map((app) => app.id);
const matched = [];
const ambiguous = [];
const unmappedCandidates = [];
const classifiedCandidates = [];

for (const repo of repositories) {
  const match = matchApp(repo);
  if (Array.isArray(match)) ambiguous.push({ ...repo, possibleApps: match });
  else if (match) matched.push({ ...repo, appId: match });
  else if (likelyApp(repo) && repositoryClassifications[repo.fullName]) classifiedCandidates.push({ ...repo, ...repositoryClassifications[repo.fullName] });
  else if (likelyApp(repo)) unmappedCandidates.push(repo);
}

const repositoriesByApp = Object.fromEntries(siteSlugs.map((slug) => [slug, matched.filter((repo) => repo.appId === slug)]));
const catalogWithoutRepository = siteSlugs.filter((slug) => repositoriesByApp[slug].length === 0);
const duplicateMappings = Object.entries(repositoriesByApp).filter(([, repos]) => repos.length > 1).map(([appId, repos]) => ({ appId, repositories: repos.map((repo) => repo.fullName) }));
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  source: inputPath ? { type: "file", path: inputPath } : { type: "github-api", owners, authenticated: Boolean(token) },
  summary: {
    repositoriesScanned: repositories.length,
    catalogApps: siteSlugs.length,
    matchedRepositories: matched.length,
    classifiedCandidates: classifiedCandidates.length,
    unmappedCandidates: unmappedCandidates.length,
    ambiguousRepositories: ambiguous.length,
    catalogAppsWithoutRepository: catalogWithoutRepository.length,
    duplicateMappings: duplicateMappings.length
  },
  consistency: { siteOnly, testOnly, runnerMissing },
  catalogWithoutRepository,
  repositoriesByApp,
  duplicateMappings,
  ambiguous,
  classifiedCandidates,
  unmappedCandidates,
  repositories
};

const lines = [
  "# GitHub App Inventory Audit",
  "",
  `Generated: ${generatedAt}`,
  "",
  `- Repositories scanned: ${repositories.length}`,
  `- Catalog apps: ${siteSlugs.length}`,
  `- Matched repositories: ${matched.length}`,
  `- Classified non-catalog repositories: ${classifiedCandidates.length}`,
  `- Unmapped app candidates: ${unmappedCandidates.length}`,
  `- Catalog apps without a repository match: ${catalogWithoutRepository.length}`,
  "",
  "## Catalog Coverage",
  "",
  "| App | Repositories |",
  "| --- | --- |",
  ...siteSlugs.map((slug) => `| ${slug} | ${repositoriesByApp[slug].map((repo) => repo.fullName).join(", ") || "MISSING"} |`),
  "",
  "## Unmapped Candidates",
  "",
  ...(unmappedCandidates.length ? unmappedCandidates.map((repo) => `- ${repo.fullName}: ${repo.description || "No description"}`) : ["None."]),
  "",
  "## Classified Candidates",
  "",
  ...(classifiedCandidates.length ? classifiedCandidates.map((repo) => `- ${repo.fullName}: ${repo.decision} -> ${repo.mapping}`) : ["None."]),
  "",
  "## Consistency Errors",
  "",
  `- Website-only apps: ${siteOnly.join(", ") || "None"}`,
  `- Testing-only apps: ${testOnly.join(", ") || "None"}`,
  `- Apps with missing runner references: ${runnerMissing.join(", ") || "None"}`,
  `- Ambiguous repository mappings: ${ambiguous.map((repo) => repo.fullName).join(", ") || "None"}`,
  ""
];

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "github-app-inventory.json"), `${JSON.stringify(report, null, 2)}\n`),
  writeFile(resolve(outputDirectory, "github-app-inventory.md"), `${lines.join("\n")}\n`)
]);

console.log(`Scanned ${repositories.length} repositories; ${matched.length} matched, ${unmappedCandidates.length} need mapping review, and ${catalogWithoutRepository.length} catalog apps lack a repository match.`);
console.log(`Reports: ${resolve(outputDirectory, "github-app-inventory.json")} and ${resolve(outputDirectory, "github-app-inventory.md")}`);

const structuralFailure = siteOnly.length || testOnly.length || runnerMissing.length || catalogWithoutRepository.length || ambiguous.length;
if (structuralFailure || (failOnUnmapped && unmappedCandidates.length)) process.exitCode = 1;
