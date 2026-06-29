export const SECTION_WEIGHTS = Object.freeze({
  coreProfile: 20,
  categoryFit: 15,
  servicesProducts: 10,
  reviews: 15,
  photosMedia: 10,
  postsUpdates: 5,
  qna: 5,
  websiteAlignment: 10,
  napConsistency: 5,
  conversionReadiness: 5,
});

export const SECTION_LABELS = Object.freeze({
  coreProfile: "Core profile completeness",
  categoryFit: "Category fit",
  servicesProducts: "Services/products",
  reviews: "Reviews",
  photosMedia: "Photos/media",
  postsUpdates: "Posts/updates",
  qna: "Q&A",
  websiteAlignment: "Website/local SEO alignment",
  napConsistency: "NAP/contact consistency",
  conversionReadiness: "Conversion readiness",
});

export const DEFAULT_AUDIT = Object.freeze({
  businessName: "",
  primaryCategory: "",
  secondaryCategories: "",
  websiteUrl: "",
  phone: "",
  addressOrServiceArea: "",
  hoursPresent: false,
  appointmentUrlPresent: false,
  coreProfile: {
    descriptionPresent: false,
    accurateMapPinOrServiceArea: false,
    openingDateOrExperiencePresent: false,
  },
  categoryFit: {
    primaryCategoryMatchesMainService: false,
    secondaryCategoriesRelevant: false,
    noCategoryStuffing: true,
  },
  servicesProducts: {
    servicesListed: false,
    serviceDescriptionsPresent: false,
    pricingOrBookingNotesPresent: false,
  },
  reviews: {
    hasRecentReviews: false,
    repliesToReviews: false,
    reviewRequestProcess: false,
  },
  photosMedia: {
    logoCoverPresent: false,
    recentPhotos: false,
    serviceProofPhotos: false,
  },
  postsUpdates: {
    postedInLast30Days: false,
    offerOrUpdatePresent: false,
  },
  qna: {
    seededQuestions: false,
    accurateAnswers: false,
  },
  websiteAlignment: {
    websiteMatchesPrimaryCategory: false,
    localLandingPagePresent: false,
    schemaOrStructuredInfoPresent: false,
  },
  napConsistency: {
    napMatchesWebsite: false,
    phoneClickableOnWebsite: false,
  },
  conversionReadiness: {
    clearCallToAction: false,
    appointmentOrQuotePath: false,
  },
  taskStatuses: {},
  notes: "",
});

const rules = [
  {
    section: "coreProfile",
    field: "businessName",
    title: "Add the exact business name",
    why: "A complete and consistent business name helps customers recognize the listing and compare it to the website.",
    fix: "Use the real-world business name and avoid adding keyword stuffing that is not part of the business name.",
    priority: "High",
    effort: "Quick",
    value: 3,
  },
  {
    section: "coreProfile",
    field: "primaryCategory",
    title: "Set the primary category",
    why: "The primary category is one of the strongest profile relevance signals in a manual GBP review.",
    fix: "Choose the closest available category for the main revenue-producing service.",
    priority: "High",
    effort: "Quick",
    value: 3,
  },
  {
    section: "coreProfile",
    field: "websiteUrl",
    title: "Add the website URL",
    why: "A website gives customers and search engines a stronger destination for service details, trust proof, and conversion.",
    fix: "Link to the best local landing page or homepage for the business, then confirm it loads on mobile.",
    priority: "High",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "phone",
    title: "Add a visible phone number",
    why: "GBP visitors often want a fast call path, especially for local service businesses.",
    fix: "Add the correct business phone and make sure it matches the website contact information.",
    priority: "High",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "addressOrServiceArea",
    title: "Confirm address or service area",
    why: "A clear address or service area reduces customer confusion and supports local relevance.",
    fix: "Use the correct public address or service areas and remove unsupported locations.",
    priority: "High",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "hoursPresent",
    title: "Publish accurate hours",
    why: "Missing hours can reduce calls and frustrate customers who need availability before contacting the business.",
    fix: "Add standard hours, special hours, or appointment-only language that matches the website.",
    priority: "High",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "appointmentUrlPresent",
    title: "Add an appointment or contact URL",
    why: "A direct conversion path helps turn profile visits into calls, bookings, quote requests, or form submissions.",
    fix: "Add the most relevant booking, quote, or contact page URL.",
    priority: "Medium",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "descriptionPresent",
    title: "Write a useful business description",
    why: "A clear description helps customers understand services, area, differentiators, and next steps.",
    fix: "Add a concise description covering main services, service area, experience, and contact path.",
    priority: "Medium",
    effort: "Quick",
    value: 1,
  },
  {
    section: "coreProfile",
    field: "accurateMapPinOrServiceArea",
    title: "Verify map pin or service area accuracy",
    why: "Wrong location data can create bad leads and trust issues.",
    fix: "Check the visible map pin or service-area setup against how the business actually serves customers.",
    priority: "High",
    effort: "Quick",
    value: 2,
  },
  {
    section: "coreProfile",
    field: "openingDateOrExperiencePresent",
    title: "Add experience or opening-date trust proof",
    why: "Experience details can make the listing more credible for local service shoppers.",
    fix: "Mention years in business, certification, or relevant experience where allowed and accurate.",
    priority: "Low",
    effort: "Quick",
    value: 1,
  },
  {
    section: "categoryFit",
    field: "primaryCategoryMatchesMainService",
    title: "Align the primary category with the main service",
    why: "A mismatched primary category weakens relevance for the searches that matter most.",
    fix: "Compare competitors and choose the closest category for the highest-value service.",
    priority: "High",
    effort: "Quick",
    value: 6,
  },
  {
    section: "categoryFit",
    field: "secondaryCategoriesRelevant",
    title: "Add only relevant secondary categories",
    why: "Secondary categories can expand coverage, but irrelevant categories create noise and risk.",
    fix: "Keep secondary categories tightly related to actual services the business provides.",
    priority: "Medium",
    effort: "Quick",
    value: 5,
  },
  {
    section: "categoryFit",
    field: "noCategoryStuffing",
    title: "Remove category stuffing",
    why: "Overbroad categories can confuse users and make the listing look less trustworthy.",
    fix: "Remove categories that are not genuine business offerings.",
    priority: "Medium",
    effort: "Quick",
    value: 4,
    passWhenTrue: true,
  },
  {
    section: "servicesProducts",
    field: "servicesListed",
    title: "List core services or products",
    why: "Service entries help customers understand what can be requested before they call.",
    fix: "Add the primary services and remove offerings that are not currently available.",
    priority: "High",
    effort: "Moderate",
    value: 4,
  },
  {
    section: "servicesProducts",
    field: "serviceDescriptionsPresent",
    title: "Add short service descriptions",
    why: "Descriptions clarify scope and reduce low-quality leads.",
    fix: "Write one or two direct sentences for each high-value service.",
    priority: "Medium",
    effort: "Moderate",
    value: 3,
  },
  {
    section: "servicesProducts",
    field: "pricingOrBookingNotesPresent",
    title: "Add pricing or booking guidance where appropriate",
    why: "Helpful expectations reduce friction and increase serious inquiries.",
    fix: "Add quote, travel, minimum-order, or appointment notes without making unsupported claims.",
    priority: "Low",
    effort: "Quick",
    value: 3,
  },
  {
    section: "reviews",
    field: "hasRecentReviews",
    title: "Get recent customer reviews",
    why: "Recent reviews are one of the clearest trust signals for local buyers.",
    fix: "Create a compliant review request process for completed customer interactions.",
    priority: "High",
    effort: "Larger",
    value: 6,
  },
  {
    section: "reviews",
    field: "repliesToReviews",
    title: "Reply to reviews",
    why: "Responses show active ownership and can answer objections for future customers.",
    fix: "Reply professionally to recent reviews, including short thanks and issue resolution where needed.",
    priority: "Medium",
    effort: "Moderate",
    value: 5,
  },
  {
    section: "reviews",
    field: "reviewRequestProcess",
    title: "Create a review request process",
    why: "Without a process, review growth usually becomes inconsistent.",
    fix: "Add a repeatable follow-up step after completed jobs or appointments.",
    priority: "Medium",
    effort: "Moderate",
    value: 4,
  },
  {
    section: "photosMedia",
    field: "logoCoverPresent",
    title: "Add logo and cover image",
    why: "Basic imagery makes the profile feel legitimate and complete.",
    fix: "Upload a clean logo and cover image sized for profile use.",
    priority: "Medium",
    effort: "Quick",
    value: 3,
  },
  {
    section: "photosMedia",
    field: "recentPhotos",
    title: "Add recent photos",
    why: "Fresh visuals signal the business is active.",
    fix: "Add recent team, vehicle, work, office, or service-context photos that fit the business.",
    priority: "Medium",
    effort: "Moderate",
    value: 4,
  },
  {
    section: "photosMedia",
    field: "serviceProofPhotos",
    title: "Add service proof photos",
    why: "Photos tied to real services help customers trust the listing.",
    fix: "Upload appropriate before/after, equipment, job-site, or proof-of-service images.",
    priority: "Medium",
    effort: "Moderate",
    value: 3,
  },
  {
    section: "postsUpdates",
    field: "postedInLast30Days",
    title: "Publish a recent update",
    why: "A recent post gives profile visitors another active signal and can promote seasonal services.",
    fix: "Add a short post about current availability, service focus, promotion, or announcement.",
    priority: "Low",
    effort: "Quick",
    value: 3,
  },
  {
    section: "postsUpdates",
    field: "offerOrUpdatePresent",
    title: "Add an offer or helpful update",
    why: "Profile updates can guide users toward a timely action.",
    fix: "Post a useful offer, deadline, availability note, or customer education item.",
    priority: "Low",
    effort: "Quick",
    value: 2,
  },
  {
    section: "qna",
    field: "seededQuestions",
    title: "Add useful Q&A coverage",
    why: "Common questions reduce friction before the customer calls or submits a form.",
    fix: "Add or answer real customer questions about services, pricing expectations, areas, hours, and booking.",
    priority: "Medium",
    effort: "Moderate",
    value: 3,
  },
  {
    section: "qna",
    field: "accurateAnswers",
    title: "Review existing Q&A answers",
    why: "Old or incorrect answers can mislead customers.",
    fix: "Correct outdated answers and flag inaccurate user-generated responses where appropriate.",
    priority: "Medium",
    effort: "Quick",
    value: 2,
  },
  {
    section: "websiteAlignment",
    field: "websiteMatchesPrimaryCategory",
    title: "Align website copy with the primary category",
    why: "The profile and website should reinforce the same main service.",
    fix: "Update homepage or landing-page headings to clearly match the main GBP category and service.",
    priority: "High",
    effort: "Moderate",
    value: 4,
  },
  {
    section: "websiteAlignment",
    field: "localLandingPagePresent",
    title: "Create or improve the local landing page",
    why: "A focused local page supports conversions and gives the GBP link a stronger destination.",
    fix: "Build a page with service, area, proof, FAQ, contact path, and accurate NAP details.",
    priority: "High",
    effort: "Larger",
    value: 4,
  },
  {
    section: "websiteAlignment",
    field: "schemaOrStructuredInfoPresent",
    title: "Add structured local business information",
    why: "Structured information helps keep business details explicit and reviewable.",
    fix: "Add local business schema or clearly structured NAP/service details where appropriate.",
    priority: "Medium",
    effort: "Moderate",
    value: 2,
  },
  {
    section: "napConsistency",
    field: "napMatchesWebsite",
    title: "Match NAP between GBP and website",
    why: "Name, address, and phone mismatches create trust and attribution problems.",
    fix: "Compare the profile, website header/footer/contact page, and major citations for consistency.",
    priority: "High",
    effort: "Moderate",
    value: 3,
  },
  {
    section: "napConsistency",
    field: "phoneClickableOnWebsite",
    title: "Make the website phone number clickable",
    why: "Mobile customers should be able to call without copying the number.",
    fix: "Use a tel: link on visible phone numbers and test it on mobile.",
    priority: "Medium",
    effort: "Quick",
    value: 2,
  },
  {
    section: "conversionReadiness",
    field: "clearCallToAction",
    title: "Add a clear call to action",
    why: "Customers need to know the next step after landing on the profile or website.",
    fix: "Use direct CTAs such as Call now, Request a quote, Book appointment, or Join beta where appropriate.",
    priority: "High",
    effort: "Quick",
    value: 3,
  },
  {
    section: "conversionReadiness",
    field: "appointmentOrQuotePath",
    title: "Create a direct quote or booking path",
    why: "Conversion-ready profiles should make it easy to move from interest to action.",
    fix: "Add a simple booking, contact, quote, or intake path and link it from profile and site pages.",
    priority: "High",
    effort: "Moderate",
    value: 2,
  },
];

function getValue(audit, rule) {
  if (Object.prototype.hasOwnProperty.call(audit, rule.field)) return audit[rule.field];
  return audit[rule.section]?.[rule.field];
}

function isPassed(audit, rule) {
  const value = getValue(audit, rule);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return rule.passWhenFalse ? value === false : value === true;
  return Boolean(value);
}

export function cloneDefaultAudit() {
  return JSON.parse(JSON.stringify(DEFAULT_AUDIT));
}

export function getScoreBand(score) {
  if (score >= 90) return "Strong";
  if (score >= 75) return "Good but improvable";
  if (score >= 50) return "Needs work";
  return "High-priority cleanup";
}

export function calculateAudit(auditInput = {}) {
  const audit = { ...cloneDefaultAudit(), ...auditInput };
  const earnedBySection = Object.fromEntries(Object.keys(SECTION_WEIGHTS).map((section) => [section, 0]));
  const possibleBySection = Object.fromEntries(Object.keys(SECTION_WEIGHTS).map((section) => [section, 0]));
  const recommendations = [];

  for (const rule of rules) {
    possibleBySection[rule.section] += rule.value;
    if (isPassed(audit, rule)) {
      earnedBySection[rule.section] += rule.value;
      continue;
    }
    recommendations.push({
      id: `${rule.section}.${rule.field}`,
      section: rule.section,
      sectionLabel: SECTION_LABELS[rule.section],
      title: rule.title,
      why: rule.why,
      fix: rule.fix,
      priority: rule.priority,
      effort: rule.effort,
      status: audit.taskStatuses?.[`${rule.section}.${rule.field}`] || "To Do",
    });
  }

  const sectionScores = Object.keys(SECTION_WEIGHTS).map((section) => {
    const possible = possibleBySection[section] || 1;
    const weightedScore = Math.round((earnedBySection[section] / possible) * SECTION_WEIGHTS[section]);
    return {
      id: section,
      label: SECTION_LABELS[section],
      weight: SECTION_WEIGHTS[section],
      earned: weightedScore,
      percent: Math.round((weightedScore / SECTION_WEIGHTS[section]) * 100),
    };
  });

  const score = Math.max(0, Math.min(100, sectionScores.reduce((sum, section) => sum + section.earned, 0)));
  recommendations.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || effortRank(a.effort) - effortRank(b.effort));

  return {
    score,
    band: getScoreBand(score),
    sectionScores,
    recommendations,
  };
}

function priorityRank(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3;
}

function effortRank(effort) {
  return { Quick: 0, Moderate: 1, Larger: 2 }[effort] ?? 3;
}

export function generateReport(auditInput = {}, calculated = calculateAudit(auditInput), date = new Date()) {
  const audit = { ...cloneDefaultAudit(), ...auditInput };
  const dateLabel = date.toISOString().slice(0, 10);
  const lines = [
    `# GBP Audit Tracker Report`,
    "",
    `Business: ${audit.businessName || "Unnamed business"}`,
    `Date: ${dateLabel}`,
    `Overall score: ${calculated.score}/100 (${calculated.band})`,
    "",
    "## Business basics",
    `- Primary category: ${audit.primaryCategory || "Not provided"}`,
    `- Secondary categories: ${audit.secondaryCategories || "Not provided"}`,
    `- Website: ${audit.websiteUrl || "Not provided"}`,
    `- Phone: ${audit.phone || "Not provided"}`,
    `- Address/service area: ${audit.addressOrServiceArea || "Not provided"}`,
    "",
    "## Section breakdown",
    ...calculated.sectionScores.map((section) => `- ${section.label}: ${section.earned}/${section.weight} (${section.percent}%)`),
    "",
    "## Prioritized fixes",
  ];

  if (calculated.recommendations.length === 0) {
    lines.push("- No open fixes found from the current manual checklist.");
  } else {
    calculated.recommendations.forEach((item, index) => {
      lines.push(`${index + 1}. [${item.priority} priority / ${item.effort} effort / ${item.status}] ${item.title}`);
      lines.push(`   - Why it matters: ${item.why}`);
      lines.push(`   - Suggested fix: ${item.fix}`);
    });
  }

  lines.push(
    "",
    "## Next-step checklist",
    "- Confirm the profile details against the live GBP dashboard.",
    "- Fix high-priority quick wins first.",
    "- Assign one owner and due date for every remaining task.",
    "- Re-run this audit after updates are published.",
    "",
    "Disclaimer: This is a manual audit helper from Maxxed Technical Systems. It is not affiliated with Google. Rankings, traffic, calls, and leads are not guaranteed."
  );

  if (audit.notes?.trim()) {
    lines.splice(lines.length - 1, 0, "", "## Internal notes", audit.notes.trim());
  }

  return `${lines.join("\n")}\n`;
}
