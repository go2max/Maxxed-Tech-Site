import { extname } from "node:path";

import { defaultScanOptions, skippedExtensions, skippedPathPatterns } from "./schema.mjs";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const OBFUSCATED_EMAIL_PATTERN = /\b([A-Z0-9._%+-]+)\s*(?:\(|\[)?\s*at\s*(?:\)|\])?\s*([A-Z0-9.-]+)\s*(?:\(|\[)?\s*dot\s*(?:\)|\])?\s*([A-Z]{2,})(?:\s*(?:\(|\[)?\s*dot\s*(?:\)|\])?\s*([A-Z]{2,}))?\b/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
const CTA_PATTERN = /\b(call|text|book|schedule|quote|estimate|contact|request|reserve|appointment|get started)\b/gi;
const SERVICE_AREA_PATTERN = /\b(serving|service area|service areas|nearby|county|counties|city|cities|local|mobile service|we travel to)\b/gi;

const unique = (items) => [...new Set(items.filter(Boolean))];
const stripTags = (html = "") => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
const decodeBasicEntities = (value = "") => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const normalizeWhitespace = (value = "") => decodeBasicEntities(value).replace(/\s+/g, " ").trim();

export function normalizeUrl(input) {
  if (!input || typeof input !== "string") throw new Error("A public website URL is required.");
  const trimmed = input.trim();
  const explicitScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (explicitScheme && !["http", "https"].includes(explicitScheme)) throw new Error("Only http and https URLs are supported.");
  const withProtocol = explicitScheme ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs are supported.");
  url.hash = "";
  return url.toString();
}

export function isAllowedPageUrl(candidate, origin) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (url.origin !== origin) return false;
  const pathname = url.pathname || "/";
  if (skippedPathPatterns.some((pattern) => pattern.test(pathname))) return false;
  const extension = extname(pathname).toLowerCase();
  if (skippedExtensions.includes(extension)) return false;
  return true;
}

function extractObfuscatedEmails(text = "") {
  const emails = [];
  let match;
  while ((match = OBFUSCATED_EMAIL_PATTERN.exec(text))) {
    const [, mailbox, domain, tld, secondTld] = match;
    const normalized = `${mailbox}@${domain}.${tld}${secondTld ? `.${secondTld}` : ""}`.toLowerCase();
    if (EMAIL_PATTERN.test(normalized)) emails.push(normalized);
    EMAIL_PATTERN.lastIndex = 0;
  }
  return emails;
}

export function extractEmails(html = "") {
  const text = normalizeWhitespace(stripTags(html));
  return unique([
    ...(html.match(EMAIL_PATTERN) || []).map((email) => email.toLowerCase()),
    ...extractObfuscatedEmails(text),
  ]);
}

export function normalizePhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function extractPhones(text = "") {
  return unique((text.match(PHONE_PATTERN) || []).map(normalizePhone));
}

export function extractMeta(html = "") {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i)?.[1]
    || "";
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1] || "";
  return {
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    robots: normalizeWhitespace(robots).toLowerCase(),
  };
}

export function extractJsonLd(html = "") {
  const blocks = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const raw = normalizeWhitespace(match[1]);
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      blocks.push({ parseError: true, raw });
    }
  }
  return blocks;
}

export function extractLinks(html = "", baseUrl) {
  const links = [];
  const pattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try {
      const url = new URL(decodeBasicEntities(match[1]), baseUrl);
      url.hash = "";
      links.push({ url: url.toString(), text: normalizeWhitespace(stripTags(match[2])) });
    } catch {
      // Ignore malformed links in public pages.
    }
  }
  return links;
}

export function detectContactSignals(page) {
  const html = page.html || "";
  const text = normalizeWhitespace(stripTags(html));
  const links = page.links || extractLinks(html, page.url);
  const lowerText = text.toLowerCase();
  const contactLinks = links.filter((link) => /contact|quote|estimate|book|schedule|appointment/i.test(`${link.url} ${link.text}`));
  const socialLinks = links.filter((link) => /facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com|yelp\.com/i.test(link.url));
  const ctas = unique((text.match(CTA_PATTERN) || []).map((item) => item.toLowerCase()));
  const serviceAreaMentions = unique((text.match(SERVICE_AREA_PATTERN) || []).map((item) => item.toLowerCase()));

  return {
    hasForm: /<form\b/i.test(html),
    hasMapEmbed: /google\.com\/maps|maps\.googleapis\.com|bing\.com\/maps/i.test(html),
    hasHours: /\b(hours|open|closed|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i.test(text),
    hasAddressCue: /\b(address|suite|ste\.?|street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|county|ca|ny|tx|fl|wa|or|az|nv)\b/i.test(text),
    hasLocalBusinessLanguage: /\b(local|near me|serving|mobile|licensed|insured|certified|years? experience|family owned)\b/i.test(lowerText),
    contactLinks,
    socialLinks,
    ctas,
    serviceAreaMentions,
  };
}

export function parsePage(url, html = "") {
  const links = extractLinks(html, url);
  return {
    url,
    html,
    text: normalizeWhitespace(stripTags(html)),
    meta: extractMeta(html),
    emails: extractEmails(html),
    phones: extractPhones(html),
    links,
    jsonLd: extractJsonLd(html),
    signals: detectContactSignals({ html, url, links }),
  };
}

export function buildCrawlPlan(seedUrl, input, options = {}) {
  const normalizedSeed = normalizeUrl(seedUrl);
  const origin = new URL(normalizedSeed).origin;
  const limit = options.pageCap || options.maxPages || defaultScanOptions.maxPages;
  const sourceLinks = Array.isArray(input)
    ? input.flatMap((page) => page.links || extractLinks(page.html || "", page.url || normalizedSeed))
    : extractLinks(input, normalizedSeed);
  const links = sourceLinks
    .map((link) => link.url || link)
    .filter((url) => isAllowedPageUrl(url, origin));
  return [normalizedSeed, ...unique(links).filter((url) => url !== normalizedSeed)].slice(0, limit);
}

export async function scanWebsite(seedUrl, fetchPageOrOptions, options = {}) {
  const scanOptions = typeof fetchPageOrOptions === "function" ? options : (fetchPageOrOptions || {});
  const fetchPage = typeof fetchPageOrOptions === "function" ? fetchPageOrOptions : scanOptions.fetchPage;
  if (typeof fetchPage !== "function") throw new Error("A fetchPage function is required.");

  const normalizedSeed = normalizeUrl(seedUrl);
  const origin = new URL(normalizedSeed).origin;
  const errors = [];
  const firstHtml = await fetchPage(normalizedSeed);
  const firstPage = parsePage(normalizedSeed, firstHtml);
  const plan = buildCrawlPlan(normalizedSeed, [firstPage], scanOptions);
  const pages = [];
  for (const url of plan) {
    try {
      const html = url === normalizedSeed ? firstHtml : await fetchPage(url);
      pages.push(url === normalizedSeed ? firstPage : parsePage(url, html));
    } catch (error) {
      errors.push({ url, message: error.message });
    }
  }
  return { seedUrl: normalizedSeed, origin, pages, errors };
}
