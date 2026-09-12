const DEFAULTS = window.UTM_DEFAULTS;

const el = {
  host: document.getElementById("host"),
  status: document.getElementById("status"),
  enabledTag: document.getElementById("enabled-tag"),
  controls: document.getElementById("controls"),
  enableToggle: document.getElementById("enable-toggle"),
  mode: document.getElementById("mode"),
  shortcuts: document.getElementById("shortcuts"),
  anim: document.getElementById("anim"),
  compactFields: document.getElementById("compactFields"),
  compactTree: document.getElementById("compactTree"),
  options: document.getElementById("open-options")
};

let settings = null;
let host = null;
let urlIsUmbraco = false; // current tab URL contains "umbraco"

function getSettings() {
  return new Promise((r) => chrome.storage.sync.get(DEFAULTS, (s) => r(s)));
}

function activeTab() {
  return new Promise((r) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t[0]))
  );
}

function labelFor(m) {
  return { hide: "Completely hide", button: "Show button", show: "Always show" }[m] || m;
}

function ensureSite() {
  if (!host) return null;
  if (!settings.sites[host]) settings.sites[host] = { enabled: true, detected: false, mode: null, anim: null };
  return settings.sites[host];
}

function persistSites() { chrome.storage.sync.set({ sites: settings.sites }); }

function siteEnabled() {
  const s = settings.sites[host];
  return s ? s.enabled !== false : true;
}

function render() {
  el.host.textContent = host || "—";
  const site = settings.sites[host];
  const enabled = siteEnabled();

  // Per-site tooltip mode.
  el.mode.value = site && site.mode ? site.mode : "";

  // Global toggles: shortcuts (ESC close + Enter submit) and sidebar animation.
  el.shortcuts.value = (settings.escClose !== false && settings.enterSubmit !== false) ? "on" : "off";
  el.anim.value = settings.disableSidebarAnimation ? "off" : "on";
  el.compactFields.value = settings.compactSpacing !== false ? "on" : "off";
  el.compactTree.value = settings.compactTree !== false ? "on" : "off";

  if (!urlIsUmbraco) {
    // Not an Umbraco page: hide all options, just show the reason.
    el.enabledTag.style.display = "none";
    el.controls.style.display = "none";
    el.status.style.display = "";
    el.status.textContent = "Inactive on this page — the URL has no “umbraco”.";
    el.status.className = "status inactive";
    return;
  }

  // Umbraco page: show the controls and the enable/disable toggle.
  el.controls.style.display = "";
  el.enableToggle.style.display = "";
  el.enableToggle.textContent = enabled ? "Disable for this site" : "Enable for this site";
  el.enableToggle.className = "toggle-btn " + (enabled ? "is-enabled" : "is-disabled");

  // Enabled/Disabled tag next to the title; no status line in either case.
  el.enabledTag.style.display = "inline-block";
  el.enabledTag.textContent = enabled ? "Enabled" : "Disabled";
  el.enabledTag.className = "tag " + (enabled ? "enabled" : "disabled");
  el.status.style.display = "none";
}

el.enableToggle.addEventListener("click", () => {
  const s = ensureSite();
  if (!s) return;
  s.enabled = !siteEnabled();
  persistSites();
  render();
});

el.mode.addEventListener("change", () => {
  const s = ensureSite();
  if (!s) return;
  s.mode = el.mode.value || null;
  persistSites();
  render();
});

el.anim.addEventListener("change", () => {
  const disabled = el.anim.value === "off";
  chrome.storage.sync.set({ disableSidebarAnimation: disabled });
  settings.disableSidebarAnimation = disabled;
  render();
});

el.shortcuts.addEventListener("change", () => {
  const on = el.shortcuts.value === "on";
  chrome.storage.sync.set({ escClose: on, enterSubmit: on });
  settings.escClose = on;
  settings.enterSubmit = on;
  render();
});

el.compactFields.addEventListener("change", () => {
  const on = el.compactFields.value === "on";
  chrome.storage.sync.set({ compactSpacing: on });
  settings.compactSpacing = on;
  render();
});

el.compactTree.addEventListener("change", () => {
  const on = el.compactTree.value === "on";
  chrome.storage.sync.set({ compactTree: on });
  settings.compactTree = on;
  render();
});

el.options.addEventListener("click", () => chrome.runtime.openOptionsPage());

(async function init() {
  settings = await getSettings();
  const tab = await activeTab();
  try {
    host = tab && tab.url ? new URL(tab.url).hostname : null;
  } catch (e) {
    host = null;
  }
  urlIsUmbraco = !!(tab && tab.url && tab.url.toLowerCase().includes("umbraco"));
  render();
})();
