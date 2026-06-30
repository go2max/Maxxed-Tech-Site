import { wordpressPlugins } from '../../content/site-data.mjs';

const CONTRACT_EXTRACTOR_REPO = 'https://github.com/Maxxed-Technical-Systems/contract-extractor';

function healthForProduct(product) {
  if (product.slug === 'contract-extractor') {
    return {
      health: 'green',
      onlineState: 'testing',
      lastTestStatus: 'pass',
      lastTestAt: '2026-06-29T18:20:00-07:00',
      lastFailureAt: null,
      crashStatus: 'No crash signal recorded',
      evidence: 'Fresh clone npm install and npm test passed on Windows after LF normalization.',
      checkSource: 'manual_verified',
      manualOverride: true,
      manualOverrideBy: 'Max / ChatGPT operator',
      manualOverrideAt: '2026-06-29T18:20:00-07:00',
      manualOverrideReason: 'Moved Contract Extractor v1.2.0 to testing after org repo push and clean clone validation.'
    };
  }

  if (product.lifecycle === 'internal_test') {
    return {
      health: 'yellow',
      onlineState: 'internal_testing',
      lastTestStatus: 'needs_review',
      lastTestAt: null,
      lastFailureAt: null,
      crashStatus: 'Manual review required',
      evidence: 'Internal testing track is active, but automated crash/ANR sync is not configured.',
      checkSource: 'catalog_seed',
      manualOverride: false
    };
  }

  if (product.lifecycle === 'testing' || product.lifecycle === 'release_prep') {
    return {
      health: 'yellow',
      onlineState: product.lifecycle,
      lastTestStatus: 'not_connected',
      lastTestAt: null,
      lastFailureAt: null,
      crashStatus: 'No live crash feed configured',
      evidence: 'Release/test status is seeded from catalog until runner or Play reporting integration is connected.',
      checkSource: 'catalog_seed',
      manualOverride: false
    };
  }

  return {
    health: 'gray',
    onlineState: product.lifecycle || 'unknown',
    lastTestStatus: 'not_run',
    lastTestAt: null,
    lastFailureAt: null,
    crashStatus: 'No test signal recorded',
    evidence: 'No automated test source is connected for this item yet.',
    checkSource: 'catalog_seed',
    manualOverride: false
  };
}

export function liveBoardItemsFromProducts(products, now = new Date().toISOString()) {
  const productItems = products.map((product) => {
    const health = healthForProduct(product);
    return {
      id: `live_${product.slug}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.category?.toLowerCase().includes('plugin') ? 'plugin' : 'app_or_program',
      category: product.category || 'Product',
      packageId: product.packageId || null,
      repoUrl: product.slug === 'contract-extractor' ? CONTRACT_EXTRACTOR_REPO : null,
      publicUrl: product.publicUrl || null,
      supportUrl: product.supportUrl || null,
      updatedAt: now,
      ...health
    };
  });

  const pluginItems = wordpressPlugins.slice(0, 30).map(([slug, name], index) => ({
    id: `live_plugin_${slug}`,
    productId: null,
    slug,
    name,
    type: 'wordpress_plugin',
    category: 'WordPress plugin',
    packageId: null,
    repoUrl: null,
    publicUrl: null,
    supportUrl: null,
    health: 'gray',
    onlineState: 'lab_candidate',
    lastTestStatus: 'not_connected',
    lastTestAt: null,
    lastFailureAt: null,
    crashStatus: 'Not live',
    evidence: 'Plugin is cataloged for the lab board, but no production package/test feed is connected.',
    checkSource: 'plugin_catalog_seed',
    manualOverride: false,
    updatedAt: now,
    sortOrder: 1000 + index
  }));

  return [...productItems, ...pluginItems];
}
