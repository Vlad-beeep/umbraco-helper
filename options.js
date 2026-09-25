const DEFAULTS = window.UTM_DEFAULTS;

const el = {
  globalMode: document.getElementById("globalMode"),
  autoDetect: document.getElementById("autoDetect"),
  handleTitles: document.getElementById("handleTitles"),
  disableSidebarAnimation: document.getElementById("disableSidebarAnimation"),
  compactSpacing: document.getElementById("compactSpacing"),
  compactTree: document.getElementById("compactTree"),
  notificationHalfWidth: document.getElementById("notificationHalfWidth"),
  notificationTimeout: document.getElementById("notificationTimeout"),
  animSelectors: document.getElementById("animSelectors"),
  resetAnim: document.getElementById("reset-anim"),
  escClose: document.getElementById("escClose"),
  escCloseLabels: document.getElementById("escCloseLabels"),
  overlaySelectors: document.getElementById("overlaySelectors"),
  enterSubmit: document.getElementById("enterSubmit"),
  enterButtonLabels: document.getElementById("enterButtonLabels"),
  sitesBody: document.getElementById("sites-body"),
  newSite: document.getElementById("new-site"),
  addSite: document.getElementById("add-site"),
  selectors: document.getElementById("selectors"),
  resetSelectors: document.getElementById("reset-selectors"),
  siteMsg: document.getElementById("site-msg"),
  save: document.getElementById("save"),
  saved: document.getElementById("saved")
};

let state = null;

function persistSites() {
  chrome.storage.sync.set({ sites: state.sites });
}

function siteMsg(text, ok) {
  el.siteMsg.textContent = text;
  el.siteMsg.style.color = ok ? "#1b6b2f" : "#a4501b";
  if (text) setTimeout(() => { el.siteMsg.textContent = ""; }, 4000);
}

function getSettings() {
  return new Promise((r) => chrome.storage.sync.get(DEFAULTS, (s) => r(s)));
}

function normalizeHost(input) {
  let v = (input || "").trim();
  if (!v) return null;
  try {
    if (/^https?:\/\//i.test(v)) v = new URL(v).hostname;
  } catch (e) { /* fall through */ }
  return v.replace(/\/.*$/, "").toLowerCase();
}

function renderSites() {
  el.sitesBody.innerHTML = "";
  const hosts = Object.keys(state.sites).sort();
  if (!hosts.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="3" class="hint">No sites yet. They are added automatically when you visit an Umbraco page.</td>';
    el.sitesBody.appendChild(tr);
    return;
  }
  hosts.forEach((host) => {
    const site = state.sites[host];
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.innerHTML = `<span class="domain">${host}</span>`;
    tr.appendChild(tdName);

    const tdEnabled = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = site.enabled !== false;
    cb.addEventListener("change", () => { site.enabled = cb.checked; persistSites(); });
    tdEnabled.appendChild(cb);
    tr.appendChild(tdEnabled);

    const tdDel = document.createElement("td");
    const del = document.createElement("button");
    del.className = "remove";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      delete state.sites[host];
      persistSites();
      renderSites();
    });
    tdDel.appendChild(del);
    tr.appendChild(tdDel);

    el.sitesBody.appendChild(tr);
  });
}

el.addSite.addEventListener("click", () => {
  const host = normalizeHost(el.newSite.value);
  if (!host) return;
  if (state.sites[host]) { siteMsg(`${host} is already in the list.`, true); el.newSite.value = ""; return; }
  state.sites[host] = { enabled: true, detected: false, mode: null };
  el.newSite.value = "";
  persistSites();
  renderSites();
  siteMsg(`Added ${host}. It activates on that site's /umbraco pages.`, true);
});
el.newSite.addEventListener("keydown", (e) => { if (e.key === "Enter") el.addSite.click(); });

el.resetSelectors.addEventListener("click", () => {
  el.selectors.value = DEFAULTS.selectors.join("\n");
});

el.resetAnim.addEventListener("click", () => {
  el.animSelectors.value = DEFAULTS.animSelectors.join("\n");
});

el.save.addEventListener("click", () => {
  const selectors = el.selectors.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const escCloseLabels = el.escCloseLabels.value
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const overlaySelectors = el.overlaySelectors.value
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const enterButtonLabels = el.enterButtonLabels.value
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const animSelectors = el.animSelectors.value
    .split("\n").map((s) => s.trim()).filter(Boolean);

  const payload = {
    globalMode: el.globalMode.value,
    autoDetect: el.autoDetect.checked,
    handleTitles: el.handleTitles.checked,
    disableSidebarAnimation: el.disableSidebarAnimation.checked,
    compactSpacing: el.compactSpacing.checked,
    compactTree: el.compactTree.checked,
    notificationHalfWidth: el.notificationHalfWidth.checked,
    notificationTimeout: el.notificationTimeout.value.trim() === ""
      ? "" : Math.max(0, parseInt(el.notificationTimeout.value, 10) || 0),
    animSelectors: animSelectors.length ? animSelectors : DEFAULTS.animSelectors,
    escClose: el.escClose.checked,
    escCloseLabels: escCloseLabels.length ? escCloseLabels : DEFAULTS.escCloseLabels,
    overlaySelectors: overlaySelectors.length ? overlaySelectors : DEFAULTS.overlaySelectors,
    enterSubmit: el.enterSubmit.checked,
    enterButtonLabels: enterButtonLabels.length ? enterButtonLabels : DEFAULTS.enterButtonLabels,
    selectors,
    sites: state.sites
  };
  chrome.storage.sync.set(payload, () => {
    el.saved.textContent = "Saved ✓";
    setTimeout(() => (el.saved.textContent = ""), 1800);
  });
});

(async function init() {
  state = await getSettings();
  el.globalMode.value = state.globalMode;
  el.autoDetect.checked = state.autoDetect !== false;
  el.handleTitles.checked = state.handleTitles !== false;
  el.disableSidebarAnimation.checked = state.disableSidebarAnimation !== false;
  el.compactSpacing.checked = state.compactSpacing !== false;
  el.compactTree.checked = state.compactTree !== false;
  el.notificationHalfWidth.checked = state.notificationHalfWidth !== false;
  el.notificationTimeout.value = state.notificationTimeout === "" || state.notificationTimeout == null
    ? "" : state.notificationTimeout;
  el.animSelectors.value = (state.animSelectors || DEFAULTS.animSelectors).join("\n");
  el.escClose.checked = state.escClose !== false;
  el.escCloseLabels.value = (state.escCloseLabels || DEFAULTS.escCloseLabels).join("\n");
  el.overlaySelectors.value = (state.overlaySelectors || DEFAULTS.overlaySelectors).join("\n");
  el.enterSubmit.checked = state.enterSubmit !== false;
  el.enterButtonLabels.value = (state.enterButtonLabels || DEFAULTS.enterButtonLabels).join("\n");
  el.selectors.value = (state.selectors || DEFAULTS.selectors).join("\n");
  renderSites();
})();
