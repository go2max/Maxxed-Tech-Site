import { readJson } from "./inspector.mjs";
import { relative, resolve, sep } from "node:path";

function ensureRelativePath(rootDir, candidatePath, code) {
  const resolvedRoot = resolve(rootDir);
  const resolvedCandidate = resolve(candidatePath);
  const relativePath = relative(resolvedRoot, resolvedCandidate);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    throw new Error(code);
  }
  return resolvedCandidate;
}

export async function loadProductConfig(configPath) {
  return readJson(configPath);
}

export function matchProduct(productsConfig, packageName) {
  const match = productsConfig.products.find((product) => product.packageId === packageName);
  if (!match) {
    throw new Error("package_mismatch_or_unconfigured_product");
  }
  return match;
}

export async function loadScriptPackManifest({ rootDir, product, requestedManifestPath, allowTestManifest = false }) {
  const approvedManifestPath = resolve(rootDir, "runner", "config", "script-packs", product.slug, "manifest.json");
  const resolvedApproved = ensureRelativePath(rootDir, approvedManifestPath, "unapproved_manifest_path");

  if (requestedManifestPath) {
    const resolvedRequested = resolve(requestedManifestPath);
    if (!allowTestManifest && resolvedRequested !== resolvedApproved) {
      throw new Error("unapproved_manifest_path");
    }
  }

  const manifest = await readJson(allowTestManifest && requestedManifestPath ? requestedManifestPath : resolvedApproved);
  if (manifest.app !== product.slug) {
    throw new Error("cross_product_manifest_rejected");
  }
  if (Array.isArray(manifest.packageIds) && !manifest.packageIds.includes(product.packageId)) {
    throw new Error("manifest_package_binding_mismatch");
  }

  for (const step of manifest.steps ?? []) {
    if (typeof step.commandRef !== "string" || step.commandRef.startsWith("/") || /^[A-Za-z]:\\/.test(step.commandRef) || step.commandRef.includes("..")) {
      throw new Error("invalid_command_ref");
    }
    ensureRelativePath(rootDir, resolve(rootDir, step.commandRef), "invalid_command_ref");
  }

  return {
    manifest,
    manifestPath: allowTestManifest && requestedManifestPath ? resolve(requestedManifestPath) : resolvedApproved,
  };
}
