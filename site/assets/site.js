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

const catalogSections = [...document.querySelectorAll("[data-catalog]")];
if (catalogSections.length) {
  const cards = catalogSections.flatMap((section) => [...section.querySelectorAll("[data-app-card]")]);
  const search = document.querySelector("[data-app-search]");
  const filters = [...document.querySelectorAll("[data-filter]")];
  const resultCount = document.querySelector("[data-result-count]");
  const emptyState = document.querySelector("[data-empty-state]");
  const query = new URLSearchParams(window.location.search).get("q") || "";
  let activeFilter = "all";

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

    catalogSections.forEach((section) => {
      const sectionCards = [...section.querySelectorAll("[data-app-card]")];
      section.hidden = sectionCards.length > 0 && sectionCards.every((card) => card.hidden);
    });

    if (resultCount) {
      resultCount.textContent = `${visible} product${visible === 1 ? "" : "s"} shown`;
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

const supportForm = document.querySelector("[data-support-form]");
if (supportForm) {
  const status = supportForm.querySelector("[data-support-status]");
  const issueSelect = supportForm.querySelector("[data-support-issue]");
  const issuePresetButtons = [...document.querySelectorAll("[data-issue-preset]")];
  const requestedIssue = new URLSearchParams(window.location.search).get("issue");

  if (requestedIssue && issueSelect && [...issueSelect.options].some((option) => option.value === requestedIssue)) {
    issueSelect.value = requestedIssue;
  }

  const syncIssueButtons = () => {
    issuePresetButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.issuePreset === issueSelect?.value));
    });
  };

  issuePresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!issueSelect) return;
      issueSelect.value = button.dataset.issuePreset;
      issueSelect.dispatchEvent(new Event("change", { bubbles: true }));
      issueSelect.focus();
    });
  });

  supportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!supportForm.reportValidity()) return;

    const data = new FormData(supportForm);
    const app = data.get("app");
    const issueType = data.get("issueType");
    const recipient = supportForm.dataset.email || "support@techmaxxed.com";
    const subject = encodeURIComponent(`${app} - ${issueType}`);
    const body = encodeURIComponent([
      "Maxxed support ticket",
      "",
      `App: ${app}`,
      `Request type: ${issueType}`,
      `Severity: ${data.get("severity")}`,
      `Device and Android version: ${data.get("device") || "Not provided"}`,
      "",
      "Steps or request details:",
      data.get("steps") || "Not provided",
      "",
      "Expected result:",
      data.get("expected") || "Not provided",
      "",
      "Actual result:",
      data.get("actual") || "Not provided",
      "",
      "Sensitive information confirmation: No passwords, upload keys, signing material, payment data, or sensitive location history included.",
    ].join("\n"));

    if (status) status.textContent = "Your email app should open with the support ticket filled in. Send that email to finish the request.";
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  });

  issueSelect?.addEventListener("change", () => {
    if (status) status.textContent = issueSelect.value === "Privacy or data"
      ? "Privacy requests route to support."
      : "";
    syncIssueButtons();
  });
  syncIssueButtons();
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
    const email = betaForm.dataset.email || "support@techmaxxed.com";
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
      "Pre-release testing interest: Yes, include development-stage apps when selected",
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
