import { commercePlans, commerceProducts, entitlementStates } from './commerce.mjs';

export const accessDecisions = {
  ALLOW: 'allow',
  WARN: 'warn',
  RESTRICT: 'restrict',
  DENY: 'deny'
};

export const paymentStatePolicy = {
  trialing: { decision: accessDecisions.ALLOW, premium: true, readOnly: false, message: 'Trial access is active.' },
  active: { decision: accessDecisions.ALLOW, premium: true, readOnly: false, message: 'Paid access is active.' },
  past_due: { decision: accessDecisions.WARN, premium: true, readOnly: false, message: 'Payment failed. Grace access may continue while billing retries.' },
  grace: { decision: accessDecisions.WARN, premium: true, readOnly: false, message: 'Grace period is active. Update billing before restriction.' },
  restricted: { decision: accessDecisions.RESTRICT, premium: false, readOnly: true, message: 'Premium actions are restricted. Read and export access should remain where possible.' },
  canceled: { decision: accessDecisions.RESTRICT, premium: false, readOnly: true, message: 'Subscription is canceled. Access ends after the paid-through period.' },
  expired: { decision: accessDecisions.RESTRICT, premium: false, readOnly: true, message: 'Subscription expired. Demo/free access only.' },
  suspended: { decision: accessDecisions.DENY, premium: false, readOnly: true, message: 'Account is suspended and must be reviewed by support.' }
};

export function normalizeState(state) {
  return entitlementStates.includes(state) ? state : 'expired';
}

export function productByEntitlementKey(entitlementKey) {
  return commerceProducts.find((product) => product.entitlementKey === entitlementKey) || null;
}

export function planBySlug(slug) {
  return commercePlans.find((plan) => plan.slug === slug) || null;
}

export function entitlementFromSubscription({ subscriptionId, customerId = null, businessId = null, productSlug, state = 'trialing', accessLevel = 'pro', startsAt = new Date().toISOString(), endsAt = null }) {
  const product = commerceProducts.find((item) => item.slug === productSlug);
  if (!product) throw new Error(`Unknown commerce product: ${productSlug}`);
  const normalizedState = normalizeState(state);
  return {
    id: `ent_${subscriptionId}_${product.slug}`.replaceAll(/[^a-zA-Z0-9_\-]/g, '_'),
    subscriptionId,
    customerId,
    businessId,
    commerceProductId: product.id,
    productSlug: product.slug,
    entitlementKey: product.entitlementKey,
    state: normalizedState,
    accessLevel,
    startsAt,
    endsAt,
    policy: paymentStatePolicy[normalizedState]
  };
}

export function evaluateEntitlement(entitlement, { feature = 'premium_action', now = new Date().toISOString() } = {}) {
  if (!entitlement) {
    return {
      decision: accessDecisions.RESTRICT,
      premium: false,
      readOnly: true,
      feature,
      state: 'missing',
      message: 'No entitlement found. Use demo/free mode or send user to website checkout.'
    };
  }
  const state = normalizeState(entitlement.state);
  const policy = paymentStatePolicy[state];
  if (entitlement.endsAt && new Date(entitlement.endsAt).getTime() < new Date(now).getTime()) {
    return {
      ...paymentStatePolicy.expired,
      feature,
      state: 'expired',
      message: 'Entitlement end date has passed. Demo/free mode only.'
    };
  }
  return {
    ...policy,
    feature,
    state,
    entitlementKey: entitlement.entitlementKey
  };
}

export function usageDecision({ planSlug, meterKey = 'actions', used = 0, requested = 1 }) {
  const plan = planBySlug(planSlug);
  if (!plan) throw new Error(`Unknown plan: ${planSlug}`);
  const allowance = meterKey === 'storage_gb'
    ? Number(plan.includedStorageGb || 0)
    : meterKey === 'seats'
      ? Number(plan.includedSeats || 0)
      : Number(plan.includedActions || 0);
  const next = Number(used) + Number(requested);
  if (allowance <= 0) {
    return { decision: accessDecisions.RESTRICT, allowance, used, requested, next, message: 'No allowance configured for this meter.' };
  }
  if (next <= allowance) {
    return { decision: accessDecisions.ALLOW, allowance, used, requested, next, remaining: allowance - next, message: 'Usage is within allowance.' };
  }
  if (plan.overagePolicy === 'metered_after_allowance') {
    return { decision: accessDecisions.WARN, allowance, used, requested, next, overage: next - allowance, message: 'Usage exceeds allowance and should be metered as overage.' };
  }
  return { decision: accessDecisions.RESTRICT, allowance, used, requested, next, overage: next - allowance, message: 'Usage exceeds allowance. Prompt upgrade before allowing more premium actions.' };
}

export function businessSeatDecision({ planSlug, activeSeats, requestedSeats = 1 }) {
  return usageDecision({ planSlug, meterKey: 'seats', used: activeSeats, requested: requestedSeats });
}
