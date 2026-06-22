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
    supportLink.href = `mailto:support@maxxedtechnicalsystems.com?subject=${subject}`;
  };
  supportSelect.addEventListener("change", updateSupportLink);
  updateSupportLink();
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});
