import { apps, roadmap, site } from '../../content/site-data.mjs';

export const packageIds = {
  'maxxed-remote': 'com.maxxedtechnicalsystems.maxxedremote',
  'maxxed-compass': null,
  'maxxed-measure': null,
  'maxxed-gold-estimator': null,
  'fishing-maxxed': null,
  'rival-rush': 'com.maxxed_technical_systems.rivalrushlaunch',
  'contract-extractor': null,
  'wordpress-bulk-content-cleanup': null
};

const supplementalProducts = [
  {
    slug: 'contract-extractor',
    name: 'Contract Extractor',
    shortName: 'Contract Extractor',
    category: 'Web utility',
    lifecycle: 'testing',
    publicStatus: 'Testing',
    currentTrack: 'live_board',
    publicUrl: null,
    privacyUrl: null,
    sourceStatus: 'repo_confirmed',
    notes: 'Contract Extractor v1.2.0 is committed to the org repo and moved to testing after clean clone validation passed.'
  }
];

const lifecycleFromStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('internal')) return 'internal_test';
  if (normalized.includes('testing')) return 'testing';
  if (normalized.includes('release')) return 'release_prep';
  if (normalized.includes('development')) return 'development';
  if (normalized.includes('next')) return 'queued';
  return 'unknown';
};

const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function productSeedsFromPublicCatalog() {
  const seeded = apps.map((app, index) => ({
    id: `prod_${app.slug}`,
    slug: app.slug,
    name: app.name,
    shortName: app.short,
    category: app.category,
    packageId: packageIds[app.slug] ?? null,
    lifecycle: lifecycleFromStatus(app.status),
    publicStatus: app.status,
    currentTrack: app.status === 'Internal testing' ? 'internal_testing' : null,
    latestVersionName: null,
    latestVersionCode: null,
    publicUrl: `${site.url}/apps/${app.slug}/`,
    privacyUrl: `${site.url}/apps/${app.slug}/privacy/`,
    supportUrl: `${site.url}/support/`,
    sourceStatus: packageIds[app.slug] ? 'catalog_seeded_partial' : 'catalog_seeded_missing_package',
    notes: app.availability || '',
    sortOrder: index + 1,
    archived: false
  }));

  const known = new Set(seeded.map((product) => product.name));
  for (const product of supplementalProducts) {
    if (known.has(product.name)) continue;
    seeded.push({
      id: `prod_${product.slug}`,
      slug: product.slug,
      name: product.name,
      shortName: product.shortName,
      category: product.category,
      packageId: packageIds[product.slug] ?? null,
      lifecycle: product.lifecycle,
      publicStatus: product.publicStatus,
      currentTrack: product.currentTrack,
      latestVersionName: '1.2.0',
      latestVersionCode: null,
      publicUrl: product.publicUrl,
      privacyUrl: product.privacyUrl,
      supportUrl: `${site.url}/support/`,
      sourceStatus: product.sourceStatus,
      notes: product.notes,
      sortOrder: seeded.length + 1,
      archived: false
    });
    known.add(product.name);
  }

  for (const [name, status, notes] of roadmap) {
    if (known.has(name)) continue;
    const slug = slugify(name);
    seeded.push({
      id: `prod_${slug}`,
      slug,
      name,
      shortName: name,
      category: status === 'Next product' ? 'Software' : 'Uncategorized',
      packageId: packageIds[slug] ?? null,
      lifecycle: lifecycleFromStatus(status),
      publicStatus: status,
      currentTrack: null,
      latestVersionName: null,
      latestVersionCode: null,
      publicUrl: `${site.url}/roadmap/`,
      privacyUrl: null,
      supportUrl: `${site.url}/support/`,
      sourceStatus: 'roadmap_seeded_missing_package',
      notes,
      sortOrder: seeded.length + 1,
      archived: false
    });
    known.add(name);
  }

  return seeded;
}

export function activeProductNames() {
  return productSeedsFromPublicCatalog().filter((product) => !product.archived).map((product) => product.name);
}
