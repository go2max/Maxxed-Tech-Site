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
  const cards = [...catalog.querySelectorAll("[data-app-card]")];
  const search = document.querySelector("[data-app-search]");
  const filters = [...document.querySelectorAll("[data-filter]")];
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
      resultCount.textContent = `${visible} app${visible === 1 ? "" : "s"} shown`;
    }
    if (emptyState) emptyState.hidden = visible !== 0;
  };

  search?.addEventListener("input", updateCatalog);
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
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
