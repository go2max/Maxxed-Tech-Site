const scriptUrl = document.currentScript?.src;
if (scriptUrl && !document.querySelector('link[data-ux-overhaul]')) {
  const uxStylesheet = document.createElement("link");
  uxStylesheet.rel = "stylesheet";
  uxStylesheet.href = new URL("ux-overhaul.css", scriptUrl).href;
  uxStylesheet.dataset.uxOverhaul = "true";
  document.head.appendChild(uxStylesheet);
}

document.documentElement.classList.add("js-ready");

const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");

const wordpressPluginListings = [
  ["AT", "Accessibility Task Tracker", "Track accessibility review tasks, owners, notes, and follow-up status inside WordPress."],
  ["AD", "Affiliate Disclosure Manager", "Manage affiliate disclosure reminders and placement checks for content review workflows."],
  ["SC", "Broken Shortcode Finder", "Find unregistered or malformed shortcode-like tokens without executing post content."],
  ["$", "Bulk Price Update Planner", "Plan bulk pricing changes with a review-first workflow before store updates are applied."],
  ["CA", "Client Content Approval", "Organize client review, approval notes, and content signoff states inside WordPress."],
  ["MP", "Client Maintenance Portal", "Give maintenance clients a focused portal for status notes, requests, and service visibility."],
  ["BG", "Contractor Before After Gallery", "Build simple before-and-after project galleries for contractor portfolio pages."],
  ["DB", "Database Cleanup Planner", "Review cleanup candidates and maintenance notes before touching WordPress database data."],
  ["DM", "Duplicate Media Finder", "Review exact-byte media duplicates using file size and streamed hashing without deletion automation."],
  ["FD", "Form Delivery Checker", "Track form delivery checks, test submissions, and follow-up notes for site maintenance."],
  ["FR", "Fraud Review Checklist", "Coordinate fraud review steps, notes, and decision checkpoints for order or account triage."],
  ["ALT", "Image Alt Text Audit", "Audit image alt metadata and review accessibility corrections one item at a time."],
  ["LG", "Legal Page Update Reminder", "Keep legal, policy, and compliance pages visible for scheduled review."],
  ["LS", "Local Business Schema Manager", "Manage local business schema details with editable business information and review notes."],
  ["LS", "Low Stock Digest", "Prepare low-stock summaries for WooCommerce operators and inventory review."],
  ["NAP", "NAP Consistency Checker", "Check name, address, and phone consistency across local business site content."],
  ["OE", "Order Export Builder", "Create reviewed order export configurations for operational reporting workflows."],
  ["OP", "Orphan Page Finder", "Find pages that need internal links, review, or removal from navigation plans."],
  ["LI", "Plugin License Inventory", "Track plugin licenses, renewal notes, owners, and operational status."],
  ["PP", "Post Purge Pro", "Preview stale posts, export a CSV backup, and review batch move-to-Trash workflows."],
  ["CE", "Product Compliance Expiration", "Track product compliance dates, expiration reminders, and review notes."],
  ["PD", "Product Data Cleanup", "Review product data quality issues before making cleanup decisions."],
  ["PI", "Product Image Audit", "Audit product image coverage, metadata, and content readiness."],
  ["RM", "Redirect Manager Pro", "Plan redirect entries and review URL cleanup work inside WordPress."],
  ["RR", "Returns Request Portal", "Organize return requests, status notes, and customer-service review steps."],
  ["EX", "Scheduled Content Expiration", "Track content expiration dates, review windows, and scheduled follow-up."],
  ["SH", "Security Header Audit", "Review website security header presence and maintenance notes."],
  ["SA", "Service Area Page Builder", "Create and organize service-area page drafts for local business websites."],
  ["SR", "Shipping Rule Auditor", "Review WooCommerce shipping rules, notes, and coverage gaps."],
  ["SD", "Stale Content Detector", "Score stale content candidates with explainable freshness signals and CSV export."],
  ["SI", "Stale Inventory Reporter", "Identify old inventory records and prepare review notes for cleanup."],
  ["ST", "Supplier Tracker for WooCommerce", "Track suppliers, product relationships, and operational notes for WooCommerce stores."],
  ["UP", "Uptime Digest Plugin", "Prepare uptime digest records and maintenance visibility for site operators."],
  ["WR", "Website Maintenance Reporter", "Summarize maintenance work, findings, and client-ready website status notes."],
  ["MC", "WooCommerce Margin Calculator", "Calculate and review product margin information for WooCommerce catalog planning."],
  ["RA", "WordPress Role Auditor", "Audit WordPress user roles, access notes, and permissions review status."],
];
const pluginAccents = ["#7dd3fc", "#86efac", "#facc15", "#fb7185", "#c084fc", "#25d0d8", "#b9ed45"];

function escapeText(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
}

function addWordPressPluginsToCatalog(catalog) {
  if (catalog.querySelector('[data-category~="wordpress"]')) return;
  wordpressPluginListings.forEach(([icon, name, summary], index) => {
    const card = document.createElement("article");
    card.className = "app-card";
    card.dataset.appCard = "";
    card.dataset.category = "utility wordpress";
    card.style.setProperty("--accent", pluginAccents[index % pluginAccents.length]);
    card.innerHTML = `<div class="app-card-top"><span class="app-icon" aria-hidden="true">${escapeText(icon)}</span><span class="status">Plugin lab candidate</span></div><h3>${escapeText(name)}</h3><p>${escapeText(summary)}</p><div class="fact-row"><span>Editable profile</span><span>Zip package</span><span>Installed artifact</span></div><span class="app-meta">WordPress plugin package</span>`;
    catalog.appendChild(card);
  });
}

function addWordPressFilter(filters) {
  const group = filters[0]?.parentElement;
  if (!group || group.querySelector('[data-filter="wordpress"]')) return;
  const button = document.createElement("button");
  button.className = "filter";
  button.type = "button";
  button.dataset.filter = "wordpress";
  button.setAttribute("aria-pressed", "false");
  button.textContent = "WordPress";
  group.appendChild(button);
}

function addProductLineupLinks() {
  const depth = (document.querySelector('link[rel="stylesheet"]')?.getAttribute("href") || "assets/site.css").startsWith("../") ? "../" : "";
  const isPortfolio = window.location.pathname.includes("/portfolio");

  if (navLinks && !navLinks.querySelector('a[href$="portfolio/"]')) {
    const appsLink = [...navLinks.querySelectorAll("a")].find((link) => link.textContent.trim() === "Apps");
    const lineup = document.createElement("a");
    lineup.href = `${depth}portfolio/`;
    lineup.textContent = "Product Lineup";
    if (isPortfolio) lineup.setAttribute("aria-current", "page");
    appsLink?.after(lineup);
  }

  document.querySelectorAll(".footer-grid ul").forEach((list) => {
    const heading = list.closest("div")?.querySelector("h2")?.textContent?.trim();
    if (heading !== "Products" || list.querySelector('a[href$="portfolio/"]')) return;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `${depth}portfolio/`;
    link.textContent = "Product Lineup";
    item.appendChild(link);
    list.insertBefore(item, list.children[1] || null);
  });
}

addProductLineupLinks();

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.dataset.open === "true";
    navLinks.dataset.open = String(!isOpen);
    navToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navLinks.dataset.open = "false";
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const catalog = document.querySelector("[data-catalog]");
if (catalog) {
  addWordPressPluginsToCatalog(catalog);
  const search = document.querySelector("[data-app-search]");
  const filters = [...document.querySelectorAll("[data-filter]")];
  addWordPressFilter(filters);
  const allFilters = [...document.querySelectorAll("[data-filter]")];
  const cards = [...catalog.querySelectorAll("[data-app-card]")];
  const resultCount = document.querySelector("[data-result-count]");
  const emptyState = document.querySelector("[data-empty-state]");
  const query = new URLSearchParams(window.location.search).get("q") || "";
  let activeFilter = "all";

  cards.forEach((card) => {
    const status = card.querySelector(".status")?.textContent?.trim();
    if (status) card.dataset.statusLabel = status;
  });

  if (search && query) search.value = query;

  const updateCatalog = () => {
    const term = (search?.value || "").trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const matchesText = !term || card.textContent.toLowerCase().includes(term);
      const categories = card.dataset.category.split(" ");
      const matchesFilter = activeFilter === "all" || categories.includes(activeFilter);
      card.hidden = !(matchesText && matchesFilter);
      if (!card.hidden) visible += 1;
    });

    if (resultCount) {
      resultCount.textContent = `${visible} product${visible === 1 ? "" : "s"} shown`;
    }
    if (emptyState) emptyState.hidden = visible !== 0;
  };

  search?.addEventListener("input", updateCatalog);
  allFilters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      allFilters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      updateCatalog();
    });
  });
  updateCatalog();
}

const supportSelect = document.querySelector("[data-support-select]");
const supportLink = document.querySelector("[data-support-link]");
if (supportSelect && supportLink) {
  const requestedApp = new URLSearchParams(window.location.search).get("app");
  if (requestedApp && [...supportSelect.options].some((option) => option.value === requestedApp)) {
    supportSelect.value = requestedApp;
  }
  const updateSupportLink = () => {
    const subject = encodeURIComponent(`${supportSelect.value} support request`);
    const email = supportLink.dataset.email || "support@techmaxxed.com";
    supportLink.href = `mailto:${email}?subject=${subject}`;
  };
  supportSelect.addEventListener("change", updateSupportLink);
  updateSupportLink();
}

const betaForm = document.querySelector("[data-beta-form]");
if (betaForm) {
  const appInputs = [...betaForm.querySelectorAll('input[name="apps"]')];
  const status = betaForm.querySelector("[data-beta-status]");
  const requestedBetaApp = new URLSearchParams(window.location.search).get("app");
  const requestedInput = appInputs.find((input) => input.dataset.appSlug === requestedBetaApp);
  if (requestedInput) requestedInput.checked = true;

  betaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedApps = appInputs.filter((input) => input.checked).map((input) => input.value);

    appInputs[0]?.setCustomValidity(selectedApps.length ? "" : "Select at least one app to test.");
    if (!betaForm.reportValidity() || !selectedApps.length) return;

    const data = new FormData(betaForm);
    const email = betaForm.dataset.email || "beta@techmaxxed.com";
    const subject = encodeURIComponent(`Beta tester application - ${selectedApps.join(", ")}`);
    const body = encodeURIComponent([
      "Tech Maxxed beta tester application",
      "",
      `Applicant email: ${data.get("email")}`,
      `Public credit name: ${data.get("creditName") || "Not provided"}`,
      `Apps requested: ${selectedApps.join(", ")}`,
      `Android device: ${data.get("device")}`,
      `Android version: ${data.get("androidVersion")}`,
      `Testing experience or notes: ${data.get("notes") || "None provided"}`,
      `Public credit permission: ${data.get("creditConsent") ? "Yes" : "No"}`,
      "Age or guardian confirmation: Yes",
      "Compensation acknowledged: Yes",
      "Beta contact consent: Yes",
    ].join("\n"));

    if (status) status.textContent = "Your email app should open with the application filled in. Send that email to finish applying.";
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  });

  appInputs.forEach((input) => input.addEventListener("change", () => appInputs[0]?.setCustomValidity("")));
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});