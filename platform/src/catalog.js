export const apps = [
  {
    id: "maxxed-remote",
    name: "Maxxed Remote",
    accent: "#35d0ba",
    scripts: [
      script("maxxed-remote-full-ux-connection", "Full UX, discovery, and TV connection test", "Runs every emulator-safe UX control in sequence, attempts discovery and an optional real-TV connection, and returns screenshots, logcat, memory, package metadata, and structured results.", 20, ["android-device-or-emulator", "powershell-7", "adb"], ["logcat", "screenshots", "result-json", "package-metadata", "memory-snapshot"], true, "runner/script-packs/maxxed-remote/maxxed-remote-full-test.ps1"),
      script("remote-launch", "Install and launch", "ADB install, cold launch, crash scan, and screenshot.", 3, ["emulator"], ["logcat", "screenshot"]),
      script("remote-navigation", "All controls and navigation", "Exercises every tab, remote control, keypad, media, apps, More, dialogs, and back paths.", 9, ["emulator"], ["uiautomator", "screenshots"]),
      script("remote-device-crud", "Saved TV lifecycle", "Creates, renames, reconnects, and removes a saved television fixture.", 6, ["emulator"], ["result-json"]),
      script("remote-invalid-host", "Invalid host rejection", "Checks malformed, unreachable, and non-private host handling.", 4, ["emulator"], ["logcat", "result-json"]),
      script("remote-physical-tv", "Physical TV acceptance", "Guides pairing, trust, control, power, and reconnect checks on a real TV.", 18, ["physical-device", "compatible-tv"], ["manual-notes", "video"], true)
    ],
    suites: { oneClick: ["maxxed-remote-full-ux-connection"], smoke: ["remote-launch", "remote-navigation"], full: ["remote-launch", "remote-navigation", "remote-device-crud", "remote-invalid-host"] }
  },
  {
    id: "maxxed-compass",
    name: "Maxxed Compass",
    accent: "#7ed957",
    scripts: [
      script("compass-launch", "Install and launch", "Cold launch, permission state, crash scan, and screenshot.", 3),
      script("compass-history", "Trips and history", "Creates trip segments, changes units, and validates history actions.", 7),
      script("compass-recovery", "Process recovery", "Recreates the activity and process while a trip is active.", 6),
      script("compass-sky-fixtures", "Sky Scanner fixtures", "Validates calculated star and constellation rendering fixtures.", 5),
      script("compass-physical", "Outdoor sensor acceptance", "Guides heading, true north, distance, lock-screen, and battery checks.", 25, ["physical-device", "outdoors"], ["manual-notes"], true)
    ],
    suites: { smoke: ["compass-launch", "compass-history"], full: ["compass-launch", "compass-history", "compass-recovery", "compass-sky-fixtures"] }
  },
  {
    id: "maxxed-measure",
    name: "Maxxed Measure",
    accent: "#ffcf4a",
    scripts: [
      script("measure-launch", "Install and launch", "Cold launch, camera-permission states, and crash scan.", 3),
      script("measure-fixtures", "Measurement fixtures", "Checks calibration and endpoint math against known fixture images.", 8),
      script("measure-history", "History and export", "Validates save, rename, delete, and export intent workflows.", 6),
      script("measure-invalid-calibration", "Calibration rejection", "Exercises zero, negative, missing, and extreme calibration values.", 5),
      script("measure-physical", "Known-object acceptance", "Guides distance, focus, perspective, lighting, and correction tests.", 20, ["physical-device", "camera", "known-object"], ["manual-notes", "photos"], true)
    ],
    suites: { smoke: ["measure-launch", "measure-fixtures"], full: ["measure-launch", "measure-fixtures", "measure-history", "measure-invalid-calibration"] }
  },
  {
    id: "maxxed-gold-estimator",
    name: "Maxxed Gold Estimator",
    accent: "#f2b134",
    scripts: [
      script("gold-launch", "Install and launch", "Cold launch, camera-permission states, and crash scan.", 3),
      script("gold-quality", "Capture quality gates", "Checks blur, lighting, missing-angle, and reference rejection fixtures.", 7),
      script("gold-analysis", "Analysis fixtures", "Validates masking, clustering, material ranges, and confidence output.", 10),
      script("gold-export", "Saved batches and CSV", "Creates, reopens, and exports a fixture batch.", 5),
      script("gold-physical", "Real sample acceptance", "Guides six-angle capture, wet/dry, scale, and lighting variation.", 25, ["physical-device", "camera", "sample"], ["manual-notes", "photos"], true)
    ],
    suites: { smoke: ["gold-launch", "gold-quality"], full: ["gold-launch", "gold-quality", "gold-analysis", "gold-export"] }
  },
  {
    id: "fishing-maxxed",
    name: "Fishing Maxxed",
    accent: "#48a9e6",
    scripts: [
      script("fishing-launch", "Install and launch", "Cold launch, permission states, and crash scan.", 3),
      script("fishing-measurement", "Catch measurement fixtures", "Checks reference calibration and correction handles.", 8),
      script("fishing-records", "Catch record lifecycle", "Validates create, edit, keeper status, delete, and CSV export.", 7),
      script("fishing-privacy", "Location and regulation safety", "Checks coordinate redaction and fail-closed regulation states.", 6),
      script("fishing-physical", "Outdoor capture acceptance", "Guides real camera, lighting, location, and known-object checks.", 20, ["physical-device", "camera", "outdoors"], ["manual-notes", "photos"], true)
    ],
    suites: { smoke: ["fishing-launch", "fishing-records"], full: ["fishing-launch", "fishing-measurement", "fishing-records", "fishing-privacy"] }
  },
  {
    id: "rival-rush",
    name: "Rival Rush",
    accent: "#fa5c8d",
    scripts: [
      script("rival-launch", "Install and launch", "Cold launch, Unity crash scan, and initial scene verification.", 3),
      script("rival-navigation", "All buttons and scenes", "Exercises menu buttons, game scenes, help, settings, credits, and back paths.", 10),
      script("rival-gameplay", "Gameplay regression", "Checks scoring, reset, profiles, persistence, and Word Rush alphabet input.", 12),
      script("rival-recovery", "Rotation and reopen", "Checks process recreation, aspect ratios, resume, and saved identity.", 7),
      script("rival-physical", "Touch and two-player acceptance", "Guides touch feel, ergonomics, performance, and final ad checks.", 18, ["physical-device", "two-testers"], ["manual-notes", "video"], true)
    ],
    suites: { smoke: ["rival-launch", "rival-navigation"], full: ["rival-launch", "rival-navigation", "rival-gameplay", "rival-recovery"] }
  }
];

function script(id, label, description, minutes, requires = ["emulator"], outputs = ["logcat", "screenshot", "result-json"], manualObservation = false, commandRef = null) {
  return { id, version: 1, label, description, minutes, requires, outputs, manualObservation, destructive: false, continueOnFailure: false, commandRef };
}

export const appById = new Map(apps.map((app) => [app.id, app]));

export function publicCatalog() {
  return apps.map(({ suites, ...app }) => ({
    ...app,
    suites: Object.entries(suites).map(([id, scriptIds]) => ({
      id,
      label: id === "smoke" ? "Smoke test" : id === "oneClick" ? "One-click full test" : "Full emulator suite",
      scriptIds,
      minutes: scriptIds.reduce((sum, scriptId) => sum + app.scripts.find((item) => item.id === scriptId).minutes, 0)
    }))
  }));
}
