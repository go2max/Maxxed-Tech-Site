import { access, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { TESTING_PRODUCTS } from "../platform/src/testing/catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productsConfig = JSON.parse(await readFile(resolve(root, "runner/config/products.example.json"), "utf8"));
const configuredBySlug = new Map(productsConfig.products.map((product) => [product.slug, product]));

if (TESTING_PRODUCTS.length !== configuredBySlug.size) {
  throw new Error("testing_catalog_product_count_mismatch");
}

for (const product of TESTING_PRODUCTS) {
  const configured = configuredBySlug.get(product.id);
  if (!configured || configured.packageId !== product.packageId || configured.packageIdConfigRequired !== false) {
    throw new Error(`testing_product_identity_mismatch:${product.id}`);
  }
  const manifestPath = resolve(root, "runner", "config", "script-packs", product.id, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.app !== product.id || !manifest.packageIds?.includes(product.packageId)) {
    throw new Error(`testing_manifest_identity_mismatch:${product.id}`);
  }
  const manifestSteps = manifest.steps?.map((step) => step.id);
  if (JSON.stringify(manifestSteps) !== JSON.stringify([...product.orderedSteps])) {
    throw new Error(`testing_manifest_step_mismatch:${product.id}`);
  }
  for (const step of manifest.steps) {
    const commandPath = resolve(root, step.commandRef);
    const relative = commandPath.slice(root.length + 1);
    if (commandPath === root || relative.startsWith(`..${sep}`) || relative === "..") {
      throw new Error(`testing_command_outside_repository:${product.id}`);
    }
    await access(commandPath);
  }
}

console.log(`Testing catalog validated for ${TESTING_PRODUCTS.length} package-bound apps.`);
