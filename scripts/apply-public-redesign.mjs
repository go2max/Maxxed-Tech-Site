const passes = [
  ["homepage presence", "./apply-homepage-presence-redesign.mjs"],
  ["sectioned catalogs", "./apply-sectioned-catalog-redesign.mjs"],
  ["product conversions", "./apply-product-page-conversion-redesign.mjs"],
  ["order and about polish", "./apply-order-about-polish.mjs"],
  ["support and mobile polish", "./apply-support-mobile-polish.mjs"],
  ["conversion flow polish", "./apply-conversion-flow-polish.mjs"],
  ["visual consistency polish", "./apply-visual-consistency-polish.mjs"],
];

for (const [label, modulePath] of passes) {
  await import(modulePath);
  console.log(`Applied public redesign pass: ${label}`);
}

console.log("Applied public redesign passes.");
