import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

export const jsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

export const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export function link(depth, path = "") {
  return `${"../".repeat(depth)}${path}`;
}

export function canonical(site, path = "") {
  return `${site.url}/${path}`;
}

export function replaceMain(html, body) {
  return html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${body}</main>`);
}

export function insertBeforeMainEnd(html, marker, block) {
  if (html.includes(marker)) return html;
  return html.replace("</main>", `${block}</main>`);
}

export function replaceMeta(html, site, title, description, path) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)} | ${escapeHtml(site.name)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${site.url}/${path}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${site.url}/${path}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(title)} | ${escapeHtml(site.name)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
}

export function depthForFile(siteRoot, filePath) {
  const rel = relative(siteRoot, filePath).split(sep).join("/");
  const folder = rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : dirname(rel);
  return folder.split("/").filter(Boolean).length;
}

export async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files;
}

export async function readText(path) {
  return readFile(resolve(path), "utf8");
}

export async function writeText(path, content) {
  return writeFile(resolve(path), content, "utf8");
}
