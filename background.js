// Service worker: seed/refresh default settings. When a shipped "system" list
// changes, bump defaultsVersion so existing installs pick up the new values on
// reload instead of keeping their frozen stored copy.
importScripts("defaults.js");

// Lists owned by the extension defaults. On a defaultsVersion bump these are
// reset to the shipped values; everything else keeps the stored value.
const SYSTEM_KEYS = ["selectors", "escCloseLabels", "overlaySelectors", "enterButtonLabels", "animSelectors"];

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
