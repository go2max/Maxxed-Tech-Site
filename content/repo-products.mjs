const accents = ["#7dd3fc", "#86efac", "#facc15", "#fb7185", "#c084fc", "#25d0d8", "#b9ed45", "#ff715b"];

const standaloneRepoNames = [
  "Broken-Link-Capture",
  "Business-Letter-Builder",
  "Cash-Job-Receipt-Log",
  "Civic-Deadline-Reminder",
  "Client-Intake-Packet-Builder",
  "Community-Meeting-Tracker",
  "Community-Resource-Directory",
  "Community-Survey-Builder",
  "Content-Approval-Extension",
  "Contract-Renewal-Reminder",
  "Document-Approval-Queue",
  "Document-Version-Register",
  "Equipment-Payback-Calculator",
  "Form-Field-Tester",
  "Freelance-Rate-Calculator",
  "Local-Project-Watchlist",
  "Local-SEO-Page-Checker",
  "Local-Volunteer-Matcher",
  "Meeting-Minutes-Organizer",
  "Neighborhood-Cleanup-Planner",
  "Neighborhood-Emergency-Board",
  "Neighborhood-Issue-Reporter",
  "PDF-Evidence-Organizer",
  "Page-Accessibility-Notes",
  "Page-Metadata-Inspector",
  "Park-Condition-Reporter",
  "Policy-Review-Tracker",
  "Public-Comment-Organizer",
  "Records-Request-Tracker",
  "Savings-Goal-Planner",
  "Scope-of-Work-Generator",
  "Screenshot-Evidence-Extension",
  "Side-Job-Profit-Calculator",
  "Simple-Debt-Payoff-Planner",
  "Simple-Proposal-Builder",
  "Streetlight-Issue-Log",
  "Structured-Data-Viewer",
  "Subscription-Cost-Analyzer",
  "Tab-Session-Organizer",
  "Template-Variable-Manager",
  "Vehicle-Cost-Per-Mile",
  "Web-Research-Source-Collector",
  "Webpage-Change-Monitor",
  "Website-Contact-Extractor",
];

const powerhouseRepoNames = [
  "allergy-symptom-journal",
  "appointment-care-pro",
  "art-commission-manager",
  "baby-toddler-control-center",
  "beauty-client-pro",
  "boat-bike-powersport-garage",
  "book-writing-studio",
  "car-rental-lite",
  "catering-event-suite",
  "client-ops-command-center",
  "clinic-admin-lite",
  "club-membership-manager",
  "coffee-bakery-batch-pro",
  "collection-manager-pro",
  "community-event-command",
  "conference-planning-pro",
  "construction-site-logbook",
  "contractor-estimate-suite",
  "courier-delivery-board",
  "course-creator-suite",
  "creator-command-center",
  "decision-notes-vault",
  "dental-vision-care-vault",
  "digital-cleanup-pro",
  "emergency-prep-command",
  "facility-maintenance-board",
  "family-care-coordinator",
  "family-food-planner",
  "field-inspection-pro",
  "field-ops-command-center",
  "fitness-coach-board",
  "fleet-trip-planner-pro",
  "food-truck-ops-pro",
  "freelancer-studio-pro",
  "fundraising-command",
  "garden-homestead-pro",
  "garden-to-kitchen-pro",
  "grocery-savings-suite",
  "hoa-community-board",
  "home-command-center",
  "home-project-planner",
  "home-service-crew-board",
  "hospitality-guest-ops",
  "household-inventory-vault",
  "job-career-command",
  "job-closeout-pro",
  "kitchen-inventory-pro",
  "learning-growth-dashboard",
  "life-admin-command",
  "listing-prep-studio",
  "low-bridge-trip-ops",
  "maker-workshop-pro",
  "meal-planning-command",
  "ministry-ops-suite",
  "mobile-detailing-manager",
  "mobile-work-order-pro",
  "move-relocation-pro",
  "moving-storage-vault",
  "museum-volunteer-ops",
  "music-gig-manager",
  "neighborhood-action-board",
  "newsletter-growth-studio",
  "nonprofit-ops-suite",
  "office-people-ops-pro",
  "outdoor-adventure-pro",
  "parent-school-dashboard",
  "personal-finance-lite-pro",
  "personal-health-records",
  "personal-records-safe",
  "pet-life-manager",
  "photography-business-pro",
  "podcast-production-suite",
  "privacy-security-command",
  "prompt-automation-library",
  "property-manager-lite",
  "real-estate-agent-pro",
  "rental-turnover-pro",
  "restaurant-shift-pro",
  "rv-camping-command",
  "saas-admin-lite",
  "sales-pipeline-pro",
  "senior-support-suite",
  "shop-ops-pro",
  "short-term-rental-host-pro",
  "small-business-admin-suite",
  "social-media-ops-pro",
  "sports-league-manager",
  "startup-ops-dashboard",
  "studio-class-manager",
  "support-desk-lite",
  "tax-document-admin",
  "tenant-experience-hub",
  "trade-material-planner",
  "travel-planning-hub",
  "vehicle-maintenance-suite",
  "venue-event-ops",
  "warehouse-micro-ops",
  "web-launch-qa-pro",
  "wedding-event-planner-pro",
  "wellness-rhythm-pro",
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titleize = (value) => value.split(/[-_\s]+/).filter(Boolean).map((word) => {
  if (["pdf", "seo", "qa", "rv", "saas", "hoa"].includes(word.toLowerCase())) return word.toUpperCase();
  return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
}).join(" ");
const iconFor = (name) => titleize(name).split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase();

function categoryFor(name) {
  const slug = slugify(name);
  if (/finance|cost|savings|debt|rate|receipt|payback|subscription/.test(slug)) return ["finance", "Finance"];
  if (/community|neighborhood|civic|public|park|streetlight|volunteer|records|policy|museum|health/.test(slug)) return ["civic", "Civic"];
  if (/content|seo|metadata|web|page|research|template|screenshot|approval|document|pdf|qa|job-closeout|tax/.test(slug)) return ["content", "Content"];
  if (/client|proposal|scope|contract|business|meeting|intake|project|job|equipment|beauty|photography|home-project|small-business/.test(slug)) return ["business", "Business"];
  return ["utility", "Utility"];
}

function summaryFor(name) {
  const title = titleize(name);
  const slug = slugify(name);
  if (/calculator|cost|rate|savings|debt|payback|subscription/.test(slug)) return `${title} helps plan, calculate, and compare practical financial decisions with a focused repo-backed workflow.`;
  if (/tracker|watchlist|register|queue|reminder|log/.test(slug)) return `${title} tracks tasks, records, deadlines, and follow-up status in a focused repo-backed workflow.`;
  if (/builder|generator/.test(slug)) return `${title} builds structured working documents and repeatable outputs from a focused repo-backed workflow.`;
  if (/checker|tester|inspector|monitor|extractor|collector/.test(slug)) return `${title} reviews websites, content, fields, or source material with a focused repo-backed workflow.`;
  if (/organizer|directory|manager/.test(slug)) return `${title} organizes operational details, contacts, assets, or records in a focused repo-backed workflow.`;
  return `${title} is a repo-backed Maxxed utility prepared for inclusion in the public product catalog.`;
}

function productFromName(name, index, status, marker) {
  const [categoryKey, categoryLabel] = categoryFor(name);
  return {
    slug: slugify(name),
    name: titleize(name),
    status,
    accent: accents[index % accents.length],
    icon: iconFor(name),
    summary: summaryFor(name),
    categoryKey: `${marker} ${categoryKey}`,
    facts: [categoryLabel, marker === "powerhouse" ? "Powerhouse repo" : "Repo backed", "Ready to list"],
  };
}

export const repoProducts = standaloneRepoNames.map((name, index) => productFromName(name, index, "Repo product", "repo"));
export const powerhouseProducts = powerhouseRepoNames.map((name, index) => productFromName(name, index, "Powerhouse repo", "powerhouse"));
