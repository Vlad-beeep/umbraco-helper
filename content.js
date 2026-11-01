(function () {
  const DEFAULTS = window.UTM_DEFAULTS;
  const HOST = location.hostname;

  let settings = null;
  let active = false;
  let mode = "button";
  let observer = null;
  let applyTimer = null;
  let bubble = null;
  let styleEl = null;
  let reportedActive = null; // last state sent to the toolbar icon

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (res) => resolve(res || DEFAULTS));
    });
  }

  function saveSites(sites) {
    chrome.storage.sync.set({ sites });
  }

  // A page counts as Umbraco only when "umbraco" appears in its URL (the login /
  // backoffice address is always /umbraco). This is the single source of truth,
  // so the extension never leaks onto a front-end that shares the same host.
  function detectUmbraco() {
    return location.href.toLowerCase().includes("umbraco");
  }

  function resolveActivation() {
    // No "umbraco" in the URL -> do nothing at all, regardless of the site list.
    if (!detectUmbraco()) {
      active = false;
      return;
    }

    const site = settings.sites[HOST];
    if (site) {
      // Known site: respect its enabled flag and optional mode override.
      active = site.enabled !== false;
      mode = site.mode || settings.globalMode;
      if (!site.detected) {
        site.detected = true;
        saveSites(settings.sites);
      }
      return;
    }

    if (settings.autoDetect) {
      // Newly detected Umbraco host: add it to the managed list (enabled).
      settings.sites[HOST] = { enabled: true, detected: true, mode: null };
      saveSites(settings.sites);
      active = true;
      mode = settings.globalMode;
      return;
    }

    active = false;
  }

  // Tell the background which toolbar icon this tab should show. Only sends on
  // change; switching from inactive to active makes the icon blink.
  function reportState() {
    if (active === reportedActive) return;
    reportedActive = active;
    try {
      chrome.runtime.sendMessage({ type: "utm-state", active, blink: active }).catch(() => {});
    } catch (e) {
      // Extension was reloaded; this orphaned content script can't talk to it.
    }
  }

  // ---- Instant hide via injected CSS -----------------------------------------
  // A stylesheet rule hides matched elements the moment they appear in the DOM,
  // so there's no flash before the per-element JavaScript runs.
  function updateStyle() {
    // Modern backoffice is styled through adopted shadow sheets instead.
    if (!active || umbracoGeneration() === "modern") {
      if (styleEl) { styleEl.textContent = ""; }
      return;
    }

    let css = "";

    // 1) Hide tooltip text (unless mode is "show"). Never hide our own button.
    if (mode !== "show") {
      const sel = (settings.selectors || []).filter(Boolean).join(",");
      if (sel) {
        css += `${sel} { display: none !important; }\n.utm-btn { display: inline-flex !important; }\n`;
      }
    }

    // 2) Kill the side-panel open/close animation when disabled.
    if (settings.disableSidebarAnimation) {
      const aSel = (settings.animSelectors || []).filter(Boolean).join(",");
      if (aSel) {
        css += `${aSel} { transition: none !important; animation: none !important; }\n`;
      }
    }

    // 3) Halve the width of publish/save toast notifications.
    if (settings.notificationHalfWidth) {
      css += ".umb-notifications__notification { width: 50% !important; max-width: 50% !important; }\n";
    }

    // 4) Compact Fields View: tighten the space each form field takes.
    if (settings.compactSpacing) {
      css += ".umb-control-group { margin-bottom: 8px !important; }\n";
      css += ".control-header { margin-bottom: 0 !important; padding-bottom: 0 !important; }\n";
    }

    // 5) Remove the vertical padding on Content tree list items.
    if (settings.compactTree) {
      css += ".umb-tree-item__label { padding-top: 0 !important; padding-bottom: 0 !important; }\n";
    }

    if (!css) {
      if (styleEl) { styleEl.textContent = ""; }
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "utm-style";
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  // ---- Bubble (message shown after clicking the icon) ------------------------
  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement("div");
    bubble.className = "utm-bubble";
    bubble.setAttribute("role", "tooltip");
    bubble.style.display = "none";
    const close = document.createElement("span");
    close.className = "utm-bubble-close";
    close.textContent = "×";
    close.addEventListener("click", hideBubble);
    const text = document.createElement("div");
    text.className = "utm-bubble-text";
    bubble.appendChild(close);
    bubble.appendChild(text);
    (document.body || document.documentElement).appendChild(bubble);
    document.addEventListener("click", (e) => {
      if (bubble.style.display !== "none" && !bubble.contains(e.target) &&
          !(e.target.classList && e.target.classList.contains("utm-btn"))) {
        hideBubble();
      }
    });
    window.addEventListener("scroll", hideBubble, true);
    return bubble;
  }

  function hideBubble() {
    if (bubble) bubble.style.display = "none";
  }

  function showBubble(anchor, html) {
    const b = ensureBubble();
    b.querySelector(".utm-bubble-text").innerHTML = html;
    b.style.display = "block";
    const r = anchor.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 6;
    let left = r.left + window.scrollX;
    b.style.top = top + "px";
    b.style.left = left + "px";
    const bw = b.offsetWidth;
    if (left + bw > window.scrollX + document.documentElement.clientWidth - 8) {
      b.style.left = Math.max(8, window.scrollX + document.documentElement.clientWidth - bw - 8) + "px";
    }
  }

  // ---- Per-element processing (button mode) ----------------------------------
  function processElement(el) {
    if (el.dataset.utmDone === "1") return;

    if (mode === "hide") {
      el.dataset.utmDone = "1";
      el.classList.add("utm-hide");
      return;
    }

    if (mode === "button") {
      const html = el.innerHTML.trim();
      const textOnly = el.textContent.trim();
      if (!textOnly) return; // nothing worth toggling
      el.dataset.utmDone = "1";
      el.classList.add("utm-hide");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "utm-btn";
      btn.title = "Show tooltip";
      btn.setAttribute("aria-label", "Show tooltip");
      btn.textContent = "ⓘ";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (bubble && bubble.style.display === "block" && btn._utmOpen) {
          hideBubble();
          btn._utmOpen = false;
        } else {
          clearOpenFlags();
          showBubble(btn, html);
          btn._utmOpen = true;
        }
      });
      el._utmBtn = btn;
      // Compact Fields View: place the button inline with the caption label so
      // it doesn't take an extra line. Otherwise keep it beside the description.
      let host = null;
      if (settings.compactSpacing) {
        const header = el.closest(".control-header");
        const label = header && header.querySelector(".control-label, label");
        if (label) {
          label.appendChild(btn);
          host = header;
        }
      }
      if (!btn.parentNode) {
        el.parentNode.insertBefore(btn, el);
        host = el.parentNode;
      }
      if (host && host.classList) host.classList.add("utm-host");
      el._utmHost = host;
    }
  }

  function clearOpenFlags() {
    document.querySelectorAll(".utm-btn").forEach((b) => (b._utmOpen = false));
  }

  // Auto-dismiss publish/save toast notifications after settings.notificationTimeout ms.
  function handleNotifications() {
    const raw = settings.notificationTimeout;
    if (raw === "" || raw == null || isNaN(Number(raw))) return; // leave default timing
    const ms = Math.max(0, Number(raw));
    document.querySelectorAll(".umb-notifications__notification").forEach((n) => {
      if (n.dataset.utmNotif === "1") return;
      n.dataset.utmNotif = "1";
      setTimeout(() => {
        if (!n.isConnected) return;
        const btn = n.querySelector('button.close, [ng-click^="removeNotification"]');
        if (btn) btn.click();
        else n.remove();
      }, ms);
    });
  }

  // ---- Keyboard shortcuts (ESC close / Enter submit) -------------------------
  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden";
  }

  // Trimmed, lower-cased *visible* label: screen-reader-only text (e.g. a split
  // button's dropdown-toggle) and our own "↵" marker are excluded, so we match
  // the real button and not its hidden a11y label.
  function baseLabel(el) {
    let source = el;
    if (el.querySelector && el.querySelector(".sr-only, .visually-hidden, [class*='sr-only']")) {
      source = el.cloneNode(true);
      source.querySelectorAll(".sr-only, .visually-hidden, [class*='sr-only']").forEach((n) => n.remove());
    }
    return (source.textContent || "").replace(/↵/g, "").trim().toLowerCase();
  }

  // Is the user currently typing into a field? If so, Enter must behave normally.
  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    const role = el.getAttribute && el.getAttribute("role");
    if (role === "textbox" || role === "combobox") return true;
    return false;
  }

  // Return the dismiss button of the top-most open overlay, or null.
  function findCloseButton() {
    const overlaySel = (settings.overlaySelectors || []).filter(Boolean).join(",");
    if (!overlaySel) return null;
    let overlays;
    try {
      overlays = Array.from(document.querySelectorAll(overlaySel)).filter(isVisible);
    } catch (e) {
      return null;
    }
    if (!overlays.length) return null; // nothing open — don't touch the page

    // Top-most = last opened (deepest in document order is a good heuristic).
    const scope = overlays[overlays.length - 1];
    const labels = (settings.escCloseLabels || []).map((s) => s.toLowerCase());

    const candidates = Array.from(
      scope.querySelectorAll('umb-button, button, a, [role="button"], [ng-click]')
    ).filter(isVisible);

    // Match exact or by prefix so "Discard" also matches "Discard changes",
    // "Close" matches "Close editor", etc. baseLabel strips a11y-only text.
    const matches = (el, lbl) => {
      const t = baseLabel(el);
      const l = (el.getAttribute("label") || el.getAttribute("aria-label") ||
                 el.getAttribute("title") || "").toLowerCase();
      return t === lbl || t.startsWith(lbl + " ") ||
             l === lbl || l.startsWith(lbl + " ");
    };

    // 1) Preferred labels, in order (Close before Cancel).
    for (const lbl of labels) {
      const hit = candidates.find((el) => matches(el, lbl));
      if (hit) return hit.tagName === "UMB-BUTTON" ? (hit.querySelector("button") || hit) : hit;
    }

    // 2) Fallback: header close icon (× / class or aria "close").
    const icon = candidates.find((el) => {
      const cls = el.className.toString().toLowerCase();
      const aria = (el.getAttribute("aria-label") || el.getAttribute("title") || "").toLowerCase();
      const txt = (el.textContent || "").trim();
      return /(^|[\s_-])close([\s_-]|$)/.test(cls) || aria.includes("close") ||
             txt === "×" || txt === "✕";
    });
    return icon || null;
  }

  // Find the primary action button Enter should press.
  // Priority follows settings.enterButtonLabels (e.g. "Submit" before
  // "Save and publish..."), preferring an open overlay over the main editor.
  function findEnterButton() {
    const labels = (settings.enterButtonLabels || []).map((s) => s.toLowerCase());
    if (!labels.length) return null;

    const overlaySel = (settings.overlaySelectors || []).filter(Boolean).join(",");
    let overlays = [];
    if (overlaySel) {
      try { overlays = Array.from(document.querySelectorAll(overlaySel)).filter(isVisible); }
      catch (e) { overlays = []; }
    }
    const scopes = [];
    if (overlays.length) scopes.push(overlays[overlays.length - 1]);
    scopes.push(document);

    for (const lbl of labels) {
      for (const scope of scopes) {
        const cands = Array.from(
          scope.querySelectorAll('umb-button, button, a, [role="button"]')
        ).filter(isVisible);
        const hit = cands.find((el) => baseLabel(el) === lbl && !el.disabled);
        if (hit) return hit.tagName === "UMB-BUTTON" ? (hit.querySelector("button") || hit) : hit;
      }
    }
    return null;
  }

  // Add a small "↵" marker (via CSS ::after) to the Enter-triggered buttons.
  function decorateEnterButtons() {
    if (!settings.enterSubmit) {
      document.querySelectorAll(".utm-enter").forEach((e) => e.classList.remove("utm-enter"));
      return;
    }
    const labels = (settings.enterButtonLabels || []).map((s) => s.toLowerCase());
    if (!labels.length) return;
    Array.from(document.querySelectorAll("umb-button, button, a")).filter(isVisible).forEach((el) => {
      if (labels.includes(baseLabel(el))) {
        const host = el.tagName === "UMB-BUTTON"
          ? (el.querySelector(".umb-button__button, button") || el)
          : el;
        host.classList.add("utm-enter");
      }
    });
  }

  // Add an "ESC" marker to the button Escape would press (the top-most open
  // overlay's Close/Cancel). Re-evaluated each cycle since the target changes
  // as overlays open and close.
  function decorateEscButtons() {
    document.querySelectorAll(".utm-esc").forEach((e) => e.classList.remove("utm-esc"));
    if (!settings.escClose) return;
    const btn = findCloseButton();
    if (btn) btn.classList.add("utm-esc");
  }

  function onKeydown(e) {
    if (!active) return;
    if (umbracoGeneration() === "modern") return; // not mapped to 14+ yet

    if ((e.key === "Escape" || e.keyCode === 27) && settings.escClose) {
      const btn = findCloseButton();
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        btn.click();
      }
      return;
    }

    if ((e.key === "Enter" || e.keyCode === 13) && settings.enterSubmit) {
      // Never hijack Enter while typing, or when combined with a modifier.
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      if (isEditable(e.target) || isEditable(document.activeElement)) return;
      const btn = findEnterButton();
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        btn.click();
      }
    }
  }

  function stripTitles() {
    if (!settings.handleTitles || mode === "show") return;
    document.querySelectorAll("[title]").forEach((el) => {
      const t = el.getAttribute("title");
      if (t && !el.dataset.utmTitle) {
        el.dataset.utmTitle = t;
        el.removeAttribute("title");
      }
    });
  }

  // ---- Auto-expand tree nodes ------------------------------------------------
  // In Content: open the root and every node one level below it (the "Site"
  // level) - names vary and there can be several. In any section: also open the
  // nodes listed in autoExpandNames. The recycle bin is never touched, and each
  // node is auto-opened only once, so collapsing one by hand sticks.
  function autoExpandTree() {
    if (!settings.autoExpandTree) return;
    const isContent = /^#\/content(\/|\?|$)/.test(location.hash);

    // The main nav tree. NB: the left nav itself is a ".umb-modalcolumn", so that
    // class must NOT be used to exclude pickers - only overlays/infinite editors.
    const tree = document.querySelector(".navigation-inner-container .umb-tree") ||
      Array.from(document.querySelectorAll(".umb-tree"))
        .find((t) => !t.closest(".umb-overlay, .umb-editor--infiniteMode"));
    if (!tree) return;

    const names = (settings.autoExpandNames || [])
      .map((n) => String(n).trim().toLowerCase())
      .filter(Boolean);

    tree.querySelectorAll("li.umb-tree-item").forEach((li) => {
      if (li.dataset.utmExp === "1") return;
      if (!li.classList.contains("has-children")) return;

      const link = li.querySelector("a.umb-tree-item__label");
      if (link && /recyclebin/i.test(link.getAttribute("href") || "")) return;

      let depth = 0;
      for (let p = li.parentElement; p && p !== tree; p = p.parentElement) {
        if (p.matches && p.matches("li.umb-tree-item")) depth++;
      }
      const named = !!link && names.includes(link.textContent.trim().toLowerCase());
      // Content: the root and the "Site" level. Any section: nodes named on
      // the list (e.g. Media > "Site settings", Settings > "Portal maintenance").
      if (!named && !(isContent && depth <= 1)) return;

      li.dataset.utmExp = "1";
      const ul = li.querySelector(":scope > ul");
      if (ul && getComputedStyle(ul).display !== "none") return; // already open
      const arrow = li.querySelector(".umb-tree-item__arrow");
      if (arrow) arrow.click(); // children load async; the observer re-runs us
    });
  }

  // ---- Production environment badge ------------------------------------------
  // Non-production URLs carry a marker (test / acc / tst / local). When none is
  // present we treat the site as production and label the top bar, so it is
  // obvious which environment you are about to edit.
  function isProduction() {
    const markers = (settings.nonProdMarkers || [])
      .map((m) => String(m).trim().toLowerCase())
      .filter(Boolean);
    const url = (location.hostname + location.pathname).toLowerCase();
    return !markers.some((m) => url.includes(m));
  }

  // ---- Backoffice generation --------------------------------------------------
  // Everything below is version-scoped: a feature only runs on the generation it
  // was written for, so old selectors never fire on a backoffice that renamed
  // everything.
  //   "modern"  - Umbraco 14+: Lit web components, UI inside shadow roots
  //   "classic" - Umbraco 8-13: sections bar across the top
  //   "legacy"  - older Umbraco: sections stacked in a column on the left
  let genCache = null;
  function umbracoGeneration() {
    if (genCache && genCache.el && genCache.el.isConnected) return genCache.kind;
    const app = document.querySelector("umb-app");
    if (app) { genCache = { kind: "modern", el: app }; return "modern"; }
    const list = findSectionsList();
    if (!list) { genCache = null; return null; }
    const items = Array.from(list.children).filter((el) => {
      if (el.id === "utm-prod-badge") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (items.length < 2) return null; // not laid out yet
    const a = items[0].getBoundingClientRect();
    const b = items[1].getBoundingClientRect();
    const kind = (b.top - a.top) > Math.max(4, a.height / 2) ? "legacy" : "classic";
    genCache = { kind: kind, el: list };
    return kind;
  }

  // ---- Modern (14+) styling ---------------------------------------------------
  // Our stylesheet cannot reach into shadow roots, so one constructed sheet is
  // adopted by every root. Rules are self-targeting via :host(...), so a single
  // sheet can safely live in all of them.
  let shadowSheet = null;
  let shadowCssText = null;
  let lastAdoptSweep = 0;

  function collectShadowRoots(node, depth, out) {
    if (depth > 60) return;
    const kids = node.children || [];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      if (el.shadowRoot) {
        out.push(el.shadowRoot);
        collectShadowRoots(el.shadowRoot, depth + 1, out);
      }
      collectShadowRoots(el, depth + 1, out);
    }
  }

  function modernCss() {
    let css = "";
    if (mode !== "show") {
      // The field description, i.e. the tooltip text we hide elsewhere.
      css += ":host(umb-property-layout) #description { display: none !important; }\n";
    }
    if (settings.compactSpacing) {
      css += ":host(umb-property-layout) { margin-bottom: 4px !important; }\n";
    }
    if (settings.compactTree) {
      css += ":host(uui-menu-item) #label-button { padding-top: 2px !important;" +
             " padding-bottom: 2px !important; }\n";
    }
    if (settings.notificationHalfWidth) {
      css += ":host(uui-toast-notification) { max-width: 50% !important; }\n";
    }
    if (settings.disableSidebarAnimation) {
      css += ":host(uui-modal-sidebar), :host(uui-modal-dialog), :host(uui-modal-container)" +
             " { transition: none !important; animation: none !important; }\n";
    }
    return css;
  }

  function applyModernCss() {
    if (!shadowSheet) {
      try { shadowSheet = new CSSStyleSheet(); }
      catch (e) { return; } // no constructable stylesheets: nothing we can do
    }
    const css = modernCss();
    const changed = css !== shadowCssText;
    if (changed) {
      try { shadowSheet.replaceSync(css); } catch (e) { return; }
      shadowCssText = css;
    }
    // Walking every shadow root is not free, so sweep on a timer unless the
    // rules themselves changed (then it must take effect at once).
    const now = Date.now();
    if (!changed && now - lastAdoptSweep < 750) return;
    lastAdoptSweep = now;

    const roots = [];
    collectShadowRoots(document.body, 0, roots);
    for (const root of roots) {
      try {
        if (!root.adoptedStyleSheets.includes(shadowSheet)) {
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, shadowSheet];
        }
      } catch (e) { /* root may reject adoption */ }
    }
  }

  function clearModernCss() {
    if (!shadowSheet) return;
    const roots = [];
    collectShadowRoots(document.body, 0, roots);
    for (const root of roots) {
      try {
        if (root.adoptedStyleSheets.includes(shadowSheet)) {
          root.adoptedStyleSheets = root.adoptedStyleSheets.filter((x) => x !== shadowSheet);
        }
      } catch (e) {}
    }
    shadowCssText = null;
  }

  // ---- Backoffice layout detection -------------------------------------------
  // Three generations so far, detected from the DOM rather than a version string:
  //   "stacked" - old Umbraco: sections run down a narrow column on the left
  //   "inline"  - Umbraco 8-13: sections run across the top
  //   "modern"  - Umbraco 14+: web components, header inside a shadow root
  function findSectionsList() {
    return document.querySelector('[data-element="sections"]') ||
           document.querySelector("ul.sections") ||
           document.querySelector(".umb-sections__list") ||
           document.querySelector(".umb-sections ul") ||
           (function () {
             const link = document.querySelector('[data-element^="section-"], .umb-sections a');
             return link ? link.closest("ul") : null;
           })();
  }

  // Ordinary selectors cannot enter shadow roots, so walk them explicitly.
  function deepFindTag(root, tag, depth) {
    if (depth > 12) return null;
    const kids = root.children || [];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      if (el.tagName.toLowerCase() === tag) return el;
      if (el.shadowRoot) {
        const inShadow = deepFindTag(el.shadowRoot, tag, depth + 1);
        if (inShadow) return inShadow;
      }
      const hit = deepFindTag(el, tag, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  let modernHeaderEl = null; // cached: the deep walk is not free
  function modernHeaderSlot() {
    if (!modernHeaderEl || !modernHeaderEl.isConnected) {
      modernHeaderEl = deepFindTag(document.body, "umb-backoffice-header", 0);
    }
    if (!modernHeaderEl || !modernHeaderEl.shadowRoot) return null;
    return modernHeaderEl.shadowRoot.firstElementChild || null;
  }

  function detectBackofficeLayout() {
    const list = findSectionsList();
    if (list) {
      const items = Array.from(list.children).filter((el) => {
        if (el.id === "utm-prod-badge") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (items.length < 2) return null; // not laid out yet
      const a = items[0].getBoundingClientRect();
      const b = items[1].getBoundingClientRect();
      const stacked = (b.top - a.top) > Math.max(4, a.height / 2);
      return { kind: stacked ? "stacked" : "inline", list: list };
    }
    const slot = modernHeaderSlot();
    return slot ? { kind: "modern", slot: slot } : null;
  }

  // A shadow root does not see our stylesheet, so that badge is styled inline.
  const PROD_BADGE_STYLE =
    "display:inline-flex;align-items:center;margin-left:16px;padding:3px 12px;" +
    "border:1px solid rgba(255,110,110,0.55);border-radius:4px;" +
    "background:rgba(214,28,28,0.18);color:#ff6b6b;font-size:13px;font-weight:700;" +
    "letter-spacing:0.3px;white-space:nowrap;pointer-events:none;";

  function findProdBadge() {
    const inDoc = document.getElementById("utm-prod-badge");
    if (inDoc) return inDoc;
    // Only the modern backoffice hides it in a shadow root; skip the deep walk
    // on older versions, where it would run on every pass for nothing.
    if (findSectionsList()) return null;
    const slot = modernHeaderSlot();
    return slot ? slot.querySelector("#utm-prod-badge") : null;
  }

  function updateProdBadge() {
    const existing = findProdBadge();
    if (!settings.prodBadge || !isProduction()) {
      if (existing) existing.remove();
      return;
    }

    const layout = detectBackofficeLayout();
    if (!layout) return; // header not rendered yet; the observer retries

    const text = settings.prodBadgeText || "Production environment";

    if (layout.kind === "modern") {
      let badge = existing;
      if (!badge || !badge.isConnected) {
        badge = document.createElement("div");
        badge.id = "utm-prod-badge";
        badge.style.cssText = PROD_BADGE_STYLE;
      }
      if (badge.textContent !== text) badge.textContent = text;
      if (badge.parentElement !== layout.slot) {
        const sections = layout.slot.querySelector("umb-backoffice-header-sections");
        if (sections && sections.nextSibling) {
          layout.slot.insertBefore(badge, sections.nextSibling);
        } else {
          layout.slot.appendChild(badge);
        }
      }
      return;
    }

    const stacked = layout.kind === "stacked";
    const list = layout.list;
    const badge = existing && existing.isConnected
      ? existing
      : document.createElement("li");
    badge.id = "utm-prod-badge";

    // Re-applied every pass, so a badge built before the bar finished laying
    // out corrects itself instead of staying rotated in a horizontal bar.
    const cls = "utm-prod-badge" + (stacked ? " utm-prod-badge--vertical" : "");
    if (badge.className !== cls) badge.className = cls;
    if (badge.textContent !== text) badge.textContent = text;

    // In the stacked bar sit in the gap above Help; otherwise go last.
    const spacer = stacked
      ? list.querySelector('[data-element="section-expand"], li.expand')
      : null;
    if (spacer) {
      if (badge.parentElement !== list || badge.nextElementSibling !== spacer) {
        list.insertBefore(badge, spacer);
      }
    } else if (badge.parentElement !== list || badge.nextElementSibling) {
      list.appendChild(badge);
    }
  }

  function applyAll() {
    if (!active) return;

    updateProdBadge(); // supported on every generation

    if (umbracoGeneration() === "modern") {
      // Umbraco 14+ renamed everything and hid it in shadow roots; the classic
      // selectors below would silently match nothing, so skip them entirely.
      applyModernCss();
      return;
    }

    decorateEnterButtons(); // runs in every mode, incl. "show"
    decorateEscButtons();
    handleNotifications();
    autoExpandTree();
    if (mode === "show") return;
    const sel = settings.selectors.join(",");
    if (sel && mode === "button") {
      let nodes = [];
      try {
        nodes = document.querySelectorAll(sel);
      } catch (err) {
        return; // bad user selector — ignore rather than break the page
      }
      nodes.forEach(processElement);
    }
    stripTitles();
  }

  function revertAll() {
    document.querySelectorAll("[data-utm-done]").forEach((el) => {
      el.classList.remove("utm-hide");
      delete el.dataset.utmDone;
      if (el._utmBtn) {
        el._utmBtn.remove();
        el._utmBtn = null;
        const host = el._utmHost;
        if (host && host.classList && !host.querySelector(".utm-btn")) {
          host.classList.remove("utm-host");
        }
        el._utmHost = null;
      }
    });
    document.querySelectorAll("[data-utm-title]").forEach((el) => {
      el.setAttribute("title", el.dataset.utmTitle);
      delete el.dataset.utmTitle;
    });
    document.querySelectorAll(".utm-enter").forEach((el) => el.classList.remove("utm-enter"));
    document.querySelectorAll(".utm-esc").forEach((el) => el.classList.remove("utm-esc"));
    document.querySelectorAll("[data-utm-exp]").forEach((el) => { delete el.dataset.utmExp; });
    const prodBadge = findProdBadge();
    if (prodBadge) prodBadge.remove();
    clearModernCss();
    hideBubble();
  }

  function scheduleApply() {
    if (applyTimer) return;
    applyTimer = setTimeout(() => {
      applyTimer = null;
      // Re-check in case activation state changed (e.g. SPA route change).
      if (!active) {
        resolveActivation();
        reportState();
        if (active) { updateStyle(); startObserver(); }
      }
      applyAll();
    }, 60);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => scheduleApply());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ---- Lifecycle -------------------------------------------------------------
  async function init() {
    settings = await getSettings();
    resolveActivation();
    reportState();
    revertAll();
    updateStyle();
    if (active) {
      applyAll();
    }
    // Only observe on Umbraco URLs — never touch the front-end app, which
    // shares the same host. Observing lets late-rendering SPA pages get caught.
    if (active || (settings.autoDetect && detectUmbraco())) {
      startObserver();
    } else {
      stopObserver();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    init();
  });

  window.addEventListener("hashchange", () => scheduleApply());
  window.addEventListener("popstate", () => scheduleApply());

  // Capture phase so we run before the page's own (non-closing) ESC handlers.
  window.addEventListener("keydown", onKeydown, true);

  init();
})();
