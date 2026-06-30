import { commercePlans, commerceProducts } from './commerce.mjs';
import { entitlementFromSubscription, normalizeState } from './entitlements.mjs';

export const requiredStripeEnv = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PUBLIC_SITE_URL'
];

export const stripeEventTypes = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_succeeded'
];

export function stripeConfigStatus(env = process.env) {
  const missing = requiredStripeEnv.filter((key) => !env[key]);
  return {
    configured: missing.length === 0,
    missing,
    mode: env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'not_configured',
    safeForLiveCheckout: missing.length === 0 && env.STRIPE_SECRET_KEY?.startsWith('sk_test_') === true
  };
}

export function priceLookupKey(planSlug, interval = 'monthly') {
  const plan = commercePlans.find((item) => item.slug === planSlug);
  if (!plan) throw new Error(`Unknown plan: ${planSlug}`);
  if (!['monthly', 'annual'].includes(interval)) throw new Error(`Unsupported billing interval: ${interval}`);
  return `maxxed_${plan.slug}_${interval}`.replaceAll('-', '_');
}

export function checkoutMetadata({ planSlug, productSlug, customerEmail = null, businessSlug = null }) {
  const plan = commercePlans.find((item) => item.slug === planSlug);
  const product = commerceProducts.find((item) => item.slug === productSlug);
  if (!plan) throw new Error(`Unknown plan: ${planSlug}`);
  if (!product) throw new Error(`Unknown commerce product: ${productSlug}`);
  return {
    plan_slug: plan.slug,
    plan_id: plan.id,
    product_slug: product.slug,
    commerce_product_id: product.id,
    entitlement_key: product.entitlementKey,
    customer_email: customerEmail || '',
    business_slug: businessSlug || '',
    source: 'techmaxxed_website'
  };
}

export function createCheckoutSessionDraft({ planSlug, productSlug, interval = 'monthly', customerEmail = null, businessSlug = null, successPath = '/account/success/', cancelPath = '/pricing/' }, env = process.env) {
  const config = stripeConfigStatus(env);
  const metadata = checkoutMetadata({ planSlug, productSlug, customerEmail, businessSlug });
  const lookupKey = priceLookupKey(planSlug, interval);
  const siteUrl = env.PUBLIC_SITE_URL || 'https://techmaxxed.com';
  return {
    provider: 'stripe',
    enabled: config.configured,
    mode: config.mode,
    blockedReason: config.configured ? null : `Missing Stripe env: ${config.missing.join(', ')}`,
    request: {
      mode: 'subscription',
      customer_email: customerEmail || undefined,
      line_items: [{ price_lookup_key: lookupKey, quantity: 1 }],
      success_url: `${siteUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${cancelPath}`,
      metadata,
      subscription_data: {
        metadata,
        trial_period_days: commercePlans.find((plan) => plan.slug === planSlug)?.trialDays || undefined
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    }
  };
}

export function subscriptionStateFromStripe(status) {
  const map = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    unpaid: 'restricted',
    canceled: 'canceled',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    paused: 'restricted'
  };
  return normalizeState(map[status] || 'expired');
}

export function entitlementUpdateFromStripeEvent(event) {
  if (!event || !stripeEventTypes.includes(event.type)) {
    return { handled: false, reason: 'unsupported_event_type' };
  }
  const object = event.data?.object || {};
  const metadata = object.metadata || object.subscription_details?.metadata || {};
  const productSlug = metadata.product_slug;
  const planSlug = metadata.plan_slug;
  const customerId = metadata.customer_id || object.customer || null;
  const businessId = metadata.business_id || metadata.business_slug || null;
  const subscriptionId = object.subscription || object.id || event.id;
  if (!productSlug || !planSlug) {
    return { handled: false, reason: 'missing_checkout_metadata', eventType: event.type };
  }
  const status = object.status || (event.type === 'invoice.payment_failed' ? 'past_due' : event.type === 'invoice.payment_succeeded' ? 'active' : 'expired');
  const state = subscriptionStateFromStripe(status);
  return {
    handled: true,
    eventType: event.type,
    planSlug,
    productSlug,
    subscriptionId,
    customerId,
    businessId,
    state,
    entitlement: entitlementFromSubscription({
      subscriptionId,
      customerId,
      businessId,
      productSlug,
      state,
      endsAt: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null
    })
  };
}

export function webhookSafetyChecklist(env = process.env) {
  const config = stripeConfigStatus(env);
  return {
    ready: config.configured && config.mode === 'test',
    checks: [
      { key: 'secret_key', ok: Boolean(env.STRIPE_SECRET_KEY), message: 'Stripe secret key is present.' },
      { key: 'webhook_secret', ok: Boolean(env.STRIPE_WEBHOOK_SECRET), message: 'Stripe webhook signing secret is present.' },
      { key: 'public_site_url', ok: Boolean(env.PUBLIC_SITE_URL), message: 'Public site URL is present.' },
      { key: 'test_mode_only', ok: config.mode === 'test', message: 'Checkout scaffold expects test-mode keys before live rollout.' }
    ]
  };
}
