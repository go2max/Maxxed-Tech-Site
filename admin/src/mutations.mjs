import { appendAuditEvent, createAuditEvent } from './audit.mjs';
import { requirePermission } from './security/rbac.mjs';

export function addProduct(state, identity, product, reason = 'Add product') {
  requirePermission(identity, 'canManageProducts');
  const now = new Date().toISOString();
  const record = {
    id: product.id || `prod_${product.slug}`,
    slug: product.slug,
    name: product.name,
    shortName: product.shortName || product.name,
    category: product.category || 'Uncategorized',
    packageId: product.packageId || null,
    lifecycle: product.lifecycle || 'development',
    publicStatus: product.publicStatus || 'Draft',
    currentTrack: product.currentTrack || null,
    latestVersionName: product.latestVersionName || null,
    latestVersionCode: product.latestVersionCode || null,
    publicUrl: product.publicUrl || null,
    privacyUrl: product.privacyUrl || null,
    supportUrl: product.supportUrl || null,
    sourceStatus: product.sourceStatus || 'not_configured',
    notes: product.notes || '',
    sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : 100,
    archived: false,
    createdAt: now,
    updatedAt: now,
    createdBy: identity.email,
    updatedBy: identity.email
  };
  const next = { ...state, products: [...(state.products || []), record] };
  return appendAuditEvent(next, createAuditEvent({ identity, action: 'product.add', targetType: 'product', targetId: record.id, after: record, reason }));
}

export function archiveProduct(state, identity, productId, reason) {
  requirePermission(identity, 'canManageProducts');
  if (!reason) throw new Error('Archive reason is required');
  const before = (state.products || []).find((product) => product.id === productId);
  if (!before) throw new Error(`Unknown product ${productId}`);
  const after = { ...before, archived: true, archivedAt: new Date().toISOString(), archivedBy: identity.email, archiveReason: reason, updatedAt: new Date().toISOString(), updatedBy: identity.email };
  const next = { ...state, products: state.products.map((product) => product.id === productId ? after : product) };
  return appendAuditEvent(next, createAuditEvent({ identity, action: 'product.archive', targetType: 'product', targetId: productId, before, after, reason }));
}

export function restoreProduct(state, identity, productId, reason = 'Restore product') {
  requirePermission(identity, 'canManageProducts');
  const before = (state.products || []).find((product) => product.id === productId);
  if (!before) throw new Error(`Unknown product ${productId}`);
  const after = { ...before, archived: false, archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: new Date().toISOString(), updatedBy: identity.email };
  const next = { ...state, products: state.products.map((product) => product.id === productId ? after : product) };
  return appendAuditEvent(next, createAuditEvent({ identity, action: 'product.restore', targetType: 'product', targetId: productId, before, after, reason }));
}

export function transitionBetaApplication(state, identity, applicationId, toStatus, reason = 'Status update') {
  requirePermission(identity, 'canManageBeta');
  const before = (state.betaApplications || []).find((item) => item.id === applicationId);
  if (!before) throw new Error(`Unknown beta application ${applicationId}`);
  const after = { ...before, status: toStatus, updatedAt: new Date().toISOString(), updatedBy: identity.email };
  const betaStatusEvent = {
    id: `beta_event_${Date.now()}`,
    betaApplicationId: applicationId,
    fromStatus: before.status,
    toStatus,
    reason,
    actorEmail: identity.email,
    createdAt: new Date().toISOString()
  };
  const next = {
    ...state,
    betaApplications: state.betaApplications.map((item) => item.id === applicationId ? after : item),
    betaStatusEvents: [...(state.betaStatusEvents || []), betaStatusEvent]
  };
  return appendAuditEvent(next, createAuditEvent({ identity, action: 'beta.transition', targetType: 'beta_application', targetId: applicationId, before, after, reason }));
}
