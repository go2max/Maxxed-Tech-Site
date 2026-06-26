import { highestRole } from './security/rbac.mjs';

export function createAuditEvent({ identity, action, targetType, targetId, before, after, reason, requestId, source }) {
  if (!identity?.email) throw new Error('Audit event requires authenticated identity');
  return {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    actor_email: identity.email,
    actor_role: highestRole(identity),
    action,
    target_type: targetType,
    target_id: targetId || null,
    before_summary: before == null ? null : JSON.stringify(before),
    after_summary: after == null ? null : JSON.stringify(after),
    reason: reason || null,
    request_id: requestId || null,
    source: source || identity.source || 'admin',
    created_at: new Date().toISOString()
  };
}

export function appendAuditEvent(state, event) {
  return {
    ...state,
    auditEvents: [...(state.auditEvents || []), event]
  };
}
