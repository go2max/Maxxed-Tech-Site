import { apps, site, wordpressPlugins } from "./site-data.mjs";

const appBySlug = new Map(apps.map((app) => [app.slug, app]));
const pluginBySlug = new Map(wordpressPlugins.map((plugin) => [plugin.slug, plugin]));

function appOffer(slug, price, label, details = {}) {
  const app = appBySlug.get(slug);
  if (!app) throw new Error(`Missing app checkout product: ${slug}`);
  return {
    id: slug,
    name: app.name,
    family: "Android app",
    price,
    billing: "one-time",
    label,
    summary: app.summary,
    status: app.status,
    productPath: `apps/${slug}/`,
    checkoutUrl: details.checkoutUrl || null,
    fulfillment: details.fulfillment || "Google Play release, beta tester access, or install instructions after purchase eligibility is confirmed.",
    notes: details.notes || "Android app availability, device compatibility, and release state vary by product.",
  };
}

function pluginOffer(slug, price, label, details = {}) {
  const plugin = pluginBySlug.get(slug);
  if (!plugin) throw new Error(`Missing plugin checkout product: ${slug}`);
  return {
    id: slug,
    name: plugin.name,
    family: "WordPress plugin",
    price,
    billing: "one-time",
    label,
    summary: plugin.summary,
    status: plugin.status,
    productPath: `plugins/${slug}/`,
    checkoutUrl: details.checkoutUrl || null,
    fulfillment: details.fulfillment || "Download link, setup notes, and support route after payment is confirmed.",
    notes: details.notes || "WordPress compatibility depends on the site, theme, and plugin mix.",
  };
}

export const checkoutConfig = {
  supportEmail: site.email,
  processorLabel: "Hosted checkout",
  processorNote: "Card details are handled by the hosted payment processor, not by TechMaxxed.com.",
  fallbackNote: "If a hosted checkout link is not live yet, the button prepares a purchase request email so the order can be invoiced manually.",
};

export const checkoutOffers = [
  appOffer("maxxed-remote", 4.99, "Launch app"),
  appOffer("maxxed-compass", 4.99, "Launch app"),
  appOffer("maxxed-measure", 7.99, "Early access"),
  appOffer("maxxed-gold-estimator", 9.99, "Field app"),
  appOffer("fishing-maxxed", 7.99, "Field app"),
  appOffer("rival-rush", 2.99, "Party game"),
  pluginOffer("accessibility-task-tracker", 19, "WordPress tool"),
  pluginOffer("stale-content-detector", 19, "WordPress tool"),
  pluginOffer("woocommerce-margin-calculator", 19, "Commerce tool"),
  pluginOffer("wordpress-role-auditor", 19, "Security tool"),
  {
    id: "wordpress-tool-bundle",
    name: "WordPress Tool Bundle",
    family: "Bundle",
    price: 49,
    billing: "one-time",
    label: "Starter bundle",
    summary: "A starter bundle for site owners who want multiple review-first WordPress workflow tools.",
    status: "Manual fulfillment",
    productPath: "plugins/",
    checkoutUrl: null,
    fulfillment: "Bundle download links and setup notes after payment is confirmed.",
    notes: "Final included plugins can be confirmed before fulfillment.",
  },
];

export function checkoutOfferForProduct(slug) {
  return checkoutOffers.find((offer) => offer.id === slug);
}

export function checkoutPathForProduct(slug) {
  return `checkout/?product=${encodeURIComponent(slug)}`;
}
