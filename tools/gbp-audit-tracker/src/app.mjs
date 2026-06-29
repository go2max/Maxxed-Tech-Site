import { calculateAudit, cloneDefaultAudit, generateReport } from "./scoring.mjs";

const STORAGE_KEY = "maxxed.gbpAuditTracker.v1";
const form = document.querySelector("[data-audit-form]");
const scoreValue = document.querySelector("[data-score-value]");
const scoreBand = document.querySelector("[data-score-band]");
const sectionBreakdown = document.querySelector("[data-section-breakdown]");
const recommendationsList = document.querySelector("[data-recommendations]");
const savedList = document.querySelector("[data-saved-audits]");
const reportOutput = document.querySelector("[data-report-output]");
const statusLine = document.querySelector("[data-status-line]");

let currentAudit = cloneDefaultAudit();
let lastCalculated = calculateAudit(currentAudit);

const fieldSelectors = [
  "businessName",
  "primaryCategory",
  "secondaryCategories",
  "websiteUrl",
  "phone",
  "addressOrServiceArea",
  "hoursPresent",
  "appointmentUrlPresent",
  "coreProfile.descriptionPresent",
  "coreProfile.accurateMapPinOrServiceArea",
  "coreProfile.openingDateOrExperiencePresent",
  "categoryFit.primaryCategoryMatchesMainService",
  "categoryFit.secondaryCategoriesRelevant",
  "categoryFit.noCategoryStuffing",
  "servicesProducts.servicesListed",
  "servicesProducts.serviceDescriptionsPresent",
  "servicesProducts.pricingOrBookingNotesPresent",
  "reviews.hasRecentReviews",
  "reviews.repliesToReviews",
  "reviews.reviewRequestProcess",
  "photosMedia.logoCoverPresent",
  "photosMedia.recentPhotos",
  "photosMedia.serviceProofPhotos",
  "postsUpdates.postedInLast30Days",
  "postsUpdates.offerOrUpdatePresent",
  "qna.seededQuestions",
  "qna.accurateAnswers",
  "websiteAlignment.websiteMatchesPrimaryCategory",
  "websiteAlignment.localLandingPagePresent",
  "websiteAlignment.schemaOrStructuredInfoPresent",
  "napConsistency.napMatchesWebsite",
  "napConsistency.phoneClickableOnWebsite",
  "conversionReadiness.clearCallToAction",
  "conversionReadiness.appointmentOrQuotePath",
  "notes",
];

function getNested(target, path) {
  return path.split(".").reduce((value, key) => value?.[key], target);
}

function setNested(target, path, value) {
  const parts = path.split(".");
  const finalKey = parts.pop();
  const parent = parts.reduce((value, key) => {
    value[key] = value[key] || {};
    return value[key];
  }, target);
  parent[finalKey] = value;
}

function readSavedAudits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedAudits(audits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
}

function readForm() {
  const next = cloneDefaultAudit();
  next.taskStatuses = { ...currentAudit.taskStatuses };
  for (const path of fieldSelectors) {
    const input = form.elements[path];
    if (!input) continue;
    setNested(next, path, input.type === "checkbox" ? input.checked : input.value.trim());
  }
  currentAudit = next;
}

function writeForm(audit) {
  currentAudit = { ...cloneDefaultAudit(), ...audit, taskStatuses: audit.taskStatuses || {} };
  for (const path of fieldSelectors) {
    const input = form.elements[path];
    if (!input) continue;
    const value = getNested(currentAudit, path);
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value || "";
  }
  render();
}

function render() {
  lastCalculated = calculateAudit(currentAudit);
  scoreValue.textContent = String(lastCalculated.score);
  scoreBand.textContent = lastCalculated.band;
  scoreBand.dataset.band = lastCalculated.band.toLowerCase().replaceAll(" ", "-");

  sectionBreakdown.innerHTML = lastCalculated.sectionScores
    .map(
      (section) => `
        <article class="section-score">
          <div>
            <strong>${escapeHtml(section.label)}</strong>
            <span>${section.earned}/${section.weight} points</span>
          </div>
          <meter min="0" max="100" value="${section.percent}">${section.percent}%</meter>
        </article>`
    )
    .join("");

  recommendationsList.innerHTML = lastCalculated.recommendations.length
    ? lastCalculated.recommendations
        .map(
          (item) => `
          <article class="recommendation" data-priority="${item.priority}">
            <div class="recommendation-head">
              <div>
                <span class="pill">${escapeHtml(item.priority)}</span>
                <span class="pill muted">${escapeHtml(item.effort)}</span>
                <span class="pill muted">${escapeHtml(item.sectionLabel)}</span>
              </div>
              <label>Status
                <select data-task-status="${escapeHtml(item.id)}">
                  ${["To Do", "In Progress", "Done"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select>
              </label>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p><strong>Why:</strong> ${escapeHtml(item.why)}</p>
            <p><strong>Fix:</strong> ${escapeHtml(item.fix)}</p>
          </article>`
        )
        .join("")
    : `<p class="empty-state">No open recommendations from the current checklist. Save the audit and export the report.</p>`;

  reportOutput.value = generateReport(currentAudit, lastCalculated);
  renderSavedAudits();
}

function renderSavedAudits() {
  const audits = readSavedAudits();
  savedList.innerHTML = audits.length
    ? audits
        .map(
          (audit) => `
        <article class="saved-audit">
          <div>
            <strong>${escapeHtml(audit.businessName || "Unnamed business")}</strong>
            <span>${escapeHtml(audit.updatedAt || audit.createdAt || "No timestamp")}</span>
          </div>
          <div class="saved-actions">
            <button type="button" data-load-audit="${escapeHtml(audit.id)}">Load</button>
            <button type="button" data-delete-audit="${escapeHtml(audit.id)}" class="danger">Delete</button>
          </div>
        </article>`
        )
        .join("")
    : `<p class="empty-state">No saved audits yet. Complete the checklist and save your first profile audit.</p>`;
}

function saveAudit() {
  readForm();
  const audits = readSavedAudits();
  const now = new Date().toISOString();
  const id = currentAudit.id || `gbp-${Date.now()}`;
  const saved = { ...currentAudit, id, createdAt: currentAudit.createdAt || now, updatedAt: now };
  const next = [saved, ...audits.filter((audit) => audit.id !== id)].slice(0, 50);
  writeSavedAudits(next);
  currentAudit = saved;
  render();
  setStatus("Audit saved locally.");
}

async function copyReport() {
  const report = generateReport(currentAudit, lastCalculated);
  try {
    await navigator.clipboard.writeText(report);
    setStatus("Report copied to clipboard.");
  } catch {
    reportOutput.select();
    document.execCommand("copy");
    setStatus("Report selected/copied using browser fallback.");
  }
}

function downloadReport() {
  const safeName = (currentAudit.businessName || "gbp-audit").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gbp-audit";
  const blob = new Blob([generateReport(currentAudit, lastCalculated)], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}-gbp-audit.md`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setStatus("Markdown report downloaded.");
}

function resetAudit() {
  writeForm(cloneDefaultAudit());
  setStatus("Started a new audit.");
}

function loadSample() {
  writeForm({
    ...cloneDefaultAudit(),
    businessName: "A. Bunch Mobile Notary",
    primaryCategory: "Notary Public",
    secondaryCategories: "Loan signing agent, Mobile notary",
    websiteUrl: "https://example.com/mobile-notary",
    phone: "916-555-0199",
    addressOrServiceArea: "Roseville, Sacramento County, Placer County, Yuba County",
    hoursPresent: true,
    appointmentUrlPresent: true,
    coreProfile: { descriptionPresent: true, accurateMapPinOrServiceArea: true, openingDateOrExperiencePresent: true },
    categoryFit: { primaryCategoryMatchesMainService: true, secondaryCategoriesRelevant: true, noCategoryStuffing: true },
    servicesProducts: { servicesListed: true, serviceDescriptionsPresent: false, pricingOrBookingNotesPresent: true },
    reviews: { hasRecentReviews: false, repliesToReviews: true, reviewRequestProcess: false },
    photosMedia: { logoCoverPresent: true, recentPhotos: false, serviceProofPhotos: false },
    postsUpdates: { postedInLast30Days: false, offerOrUpdatePresent: false },
    qna: { seededQuestions: true, accurateAnswers: true },
    websiteAlignment: { websiteMatchesPrimaryCategory: true, localLandingPagePresent: true, schemaOrStructuredInfoPresent: false },
    napConsistency: { napMatchesWebsite: true, phoneClickableOnWebsite: true },
    conversionReadiness: { clearCallToAction: true, appointmentOrQuotePath: true },
    notes: "Sample fixture for smoke testing the MVP flow.",
  });
  setStatus("Loaded sample audit data.");
}

function setStatus(message) {
  statusLine.textContent = message;
  window.setTimeout(() => {
    if (statusLine.textContent === message) statusLine.textContent = "";
  }, 4500);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

form.addEventListener("input", () => {
  readForm();
  render();
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-task-status]")) {
    currentAudit.taskStatuses[event.target.dataset.taskStatus] = event.target.value;
    render();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("[data-save-audit]")) saveAudit();
  if (target.matches("[data-copy-report]")) copyReport();
  if (target.matches("[data-download-report]")) downloadReport();
  if (target.matches("[data-reset-audit]")) resetAudit();
  if (target.matches("[data-load-sample]")) loadSample();
  if (target.matches("[data-load-audit]")) {
    const audit = readSavedAudits().find((item) => item.id === target.dataset.loadAudit);
    if (audit) {
      writeForm(audit);
      setStatus("Loaded saved audit.");
    }
  }
  if (target.matches("[data-delete-audit]")) {
    writeSavedAudits(readSavedAudits().filter((item) => item.id !== target.dataset.deleteAudit));
    renderSavedAudits();
    setStatus("Saved audit deleted.");
  }
});

writeForm(currentAudit);
