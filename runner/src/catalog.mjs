import { readJson } from "./inspector.mjs";

export async function loadProductConfig(configPath) {
  return readJson(configPath);
}

export async function loadScriptPackManifest(manifestPath) {
  return readJson(manifestPath);
}

export function matchProduct(productsConfig, packageName) {
  const match = productsConfig.products.find((product) => product.packageId === packageName);
  if (!match) {
    throw new Error("package_mismatch_or_unconfigured_product");
  }
  return match;
}
