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

  // ---- Instant hide via injected CSS -----------------------------------------
  // A stylesheet rule hides matched elements the moment they appear in the DOM,
  // so there's no flash before the per-element JavaScript runs.
  function updateStyle() {
    if (!active) {
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

  function applyAll() {
    if (!active) return;
    decorateEnterButtons(); // runs in every mode, incl. "show"
    decorateEscButtons();
    handleNotifications();
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
    hideBubble();
  }

  function scheduleApply() {
    if (applyTimer) return;
    applyTimer = setTimeout(() => {
      applyTimer = null;
      // Re-check in case activation state changed (e.g. SPA route change).
      if (!active) {
        resolveActivation();
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
