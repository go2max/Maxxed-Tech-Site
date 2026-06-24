import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SAFE_ID = /^[A-Za-z0-9._:-]{1,80}$/;

export async function loadArtifactCatalog(path) {
  const absolutePath = resolve(path);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(absolutePath, "utf8"));
  } catch {
    throw new Error("invalid_artifact_catalog");
  }
  if (!parsed || typeof parsed !== "object" || !parsed.products || typeof parsed.products !== "object") {
    throw new Error("invalid_artifact_catalog");
  }
  const baseDir = dirname(absolutePath);
  const products = {};
  for (const [productId, entry] of Object.entries(parsed.products)) {
    if (!SAFE_ID.test(productId) || !entry || typeof entry !== "object") {
      throw new Error("invalid_artifact_catalog_entry");
    }
    if (typeof entry.apk !== "string" || !entry.apk.trim() ||
        typeof entry.manifest !== "string" || !entry.manifest.trim()) {
      throw new Error("invalid_artifact_catalog_entry");
    }
    products[productId] = {
      apk: resolve(baseDir, entry.apk),
      manifest: resolve(baseDir, entry.manifest),
    };
  }
  if (Object.keys(products).length === 0) throw new Error("empty_artifact_catalog");
  return { path: absolutePath, products };
}

export function selectArtifact(catalog, productId) {
  const artifact = catalog.products[productId];
  if (!artifact) throw new Error("unsupported_claimed_product");
  return artifact;
}
