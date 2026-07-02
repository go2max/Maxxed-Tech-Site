const preview = document.querySelector('#checkout-preview');
const planLabels = {
  'plugin-starter': 'Individual Plugin Pro',
  'plugin-bundle': 'Plugin Bundle',
  'business-pro': 'Business Pro',
  'field-individual': 'Field Tool Individual'
};
const productLabels = {
  'post-purge-pro': 'Post Purge Pro',
  'business-request-hub': 'Business Request Hub',
  'maxxed-measure': 'Maxxed Measure'
};

function renderPreview(button) {
  const plan = button.dataset.checkoutPlan;
  const product = button.dataset.checkoutProduct;
  const label = `${planLabels[plan] || plan} → ${productLabels[product] || product}`;
  if (!preview) return;
  preview.innerHTML = `<strong>Checkout draft:</strong> ${label}. Server checkout remains disabled until Stripe test-mode keys, webhook verification, and entitlement sync are configured. Email <a href="mailto:support@techmaxxed.com">support@techmaxxed.com</a> for early access.`;
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-checkout-plan][data-checkout-product]');
  if (!button) return;
  renderPreview(button);
});
