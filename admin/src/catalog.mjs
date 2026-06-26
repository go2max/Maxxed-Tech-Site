import { apps, roadmap, site } from '../../content/site-data.mjs';

export const packageIds = {
  'maxxed-remote': 'com.maxxedtechnicalsystems.maxxedremote',
  'maxxed-compass': null,
  'maxxed-measure': null,
  'maxxed-gold-estimator': null,
  'fishing-maxxed': null,
  'rival-rush': 'com.maxxed_technical_systems.rivalrushlaunch',
  'wordpress-bulk-content-cleanup': null
};

const lifecycleFromStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('internal')) return 'internal_test';
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
  }

  return seeded;
}

export function activeProductNames() {
  return productSeedsFromPublicCatalog().filter((product) => !product.archived).map((product) => product.name);
}
