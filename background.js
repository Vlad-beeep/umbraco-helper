// Service worker: seed/refresh default settings. When a shipped "system" list
// changes, bump defaultsVersion so existing installs pick up the new values on
// reload instead of keeping their frozen stored copy.
importScripts("defaults.js");

// Lists owned by the extension defaults. On a defaultsVersion bump these are
// reset to the shipped values; everything else keeps the stored value.
const SYSTEM_KEYS = ["selectors", "escCloseLabels", "overlaySelectors", "enterButtonLabels", "animSelectors", "autoExpandNames"];

function syncDefaults() {
  chrome.storage.sync.get(null, (stored) => {
    stored = stored || {};
    const versionChanged = stored.defaultsVersion !== self.UTM_DEFAULTS.defaultsVersion;
    const missing = Object.keys(self.UTM_DEFAULTS).filter((k) => !(k in stored));
    if (!versionChanged && missing.length === 0) return;

    const merged = Object.assign({}, self.UTM_DEFAULTS, stored);
    if (versionChanged) {
      SYSTEM_KEYS.forEach((k) => { merged[k] = self.UTM_DEFAULTS[k]; });
      merged.defaultsVersion = self.UTM_DEFAULTS.defaultsVersion;
    }
    chrome.storage.sync.set(merged);
  });
}

chrome.runtime.onInstalled.addListener(syncDefaults);
chrome.runtime.onStartup.addListener(syncDefaults);
syncDefaults();

// ---- Toolbar icon state ------------------------------------------------------
// The manifest icon is grey (off). Content scripts report whether they are
// active on their tab: active tabs get the normal icon, and a fresh activation
// blinks green twice so it's obvious the extension picked the site up.
// Chrome drops per-tab icons on cross-document navigation, so a tab that leaves
// the backoffice falls back to grey on its own.
const ICON_ON = { 16: "icons/icon16.png", 32: "icons/icon32.png" };
const ICON_OFF = { 16: "icons/state/off16.png", 32: "icons/state/off32.png" };
const ICON_BLINK = { 16: "icons/state/blink16.png", 32: "icons/state/blink32.png" };
const BLINK_MS = 250;
const iconRuns = {}; // tabId -> run counter; a newer state cancels a running blink

function setTabIcon(tabId, path) {
  chrome.action.setIcon({ tabId, path }).catch(() => {}); // tab may be gone
}

function showState(tabId, active, blink) {
  const run = (iconRuns[tabId] = (iconRuns[tabId] || 0) + 1);
  if (!active || !blink) {
    setTabIcon(tabId, active ? ICON_ON : ICON_OFF);
    return;
  }
  [ICON_BLINK, ICON_ON, ICON_BLINK, ICON_ON].forEach((path, i) => {
    setTimeout(() => { if (iconRuns[tabId] === run) setTabIcon(tabId, path); }, i * BLINK_MS);
  });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "utm-state" && sender.tab) {
    showState(sender.tab.id, !!msg.active, !!msg.blink);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => { delete iconRuns[tabId]; });
