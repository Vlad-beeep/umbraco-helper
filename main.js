// main.js — testing scratchpad for the Portal Tooltip Manager extension.
//
// This is NOT loaded by the extension. It's a standalone harness you paste into
// the DevTools Console on the target portal
// (https://portal-upg.xpt-spx-prt-acc.xpand.local/) to experiment with
// detection + tooltip selectors before baking them into defaults.js.
//
// Usage:
//   1. Open the portal, log in, press F12 -> Console.
//   2. Paste this whole file (or run individual UTM_TEST.* calls).
//   3. UTM_TEST.audit()   -> see what each selector matches
//      UTM_TEST.detect()  -> check the auto-detect logic
//      UTM_TEST.hide()    -> temporarily hide matches (preview "hide" mode)
//      UTM_TEST.show()    -> undo hide
//      UTM_TEST.mark()    -> outline matches in red so you can see them
//      UTM_TEST.unmark()  -> remove outlines

(function () {
  // Keep this list in sync with defaults.js -> selectors.
  const SELECTORS = [
    ".block-header-description",
    ".menu-item__tooltip",
    ".unpinned-icon-tooltip-text",
    ".k-tooltip-content",
    ".icon-information",
    "a.tooltip",
  ];

  function nodes() {
    const seen = new Set();
    SELECTORS.forEach((s) => {
      try {
        document.querySelectorAll(s).forEach((n) => seen.add(n));
      } catch (e) {
        console.warn("Bad selector:", s, e.message);
      }
    });
    return Array.from(seen);
  }

  const UTM_TEST = {
    selectors: SELECTORS,

    // Replicates content.js detectUmbraco() (incl. the Xpand Portal branch).
    detect() {
      const path = (location.pathname + location.hash).toLowerCase();
      const umbPath = /\/umbraco(\/|#|$|\?)/.test(path);
      const umbDom = !!document.querySelector(
        'umb-app, umb-backoffice, #umbracoMainWrapper, .umb-app, [ng-app="umbraco"], [data-element="global-user"]'
      );
      const body = document.body;
      const xpand =
        !!(body &&
          /(^|\s)xpage-/.test(body.className) &&
          document.querySelector('[class*="xpand-"], .k-tooltip, .menu-item__tooltip'));
      const result = { umbPath, umbDom, xpand, detected: umbPath || umbDom || xpand };
      console.table(result);
      return result;
    },

    // Count + sample text for each selector.
    audit() {
      const rows = SELECTORS.map((s) => {
        let ns = [];
        try { ns = Array.from(document.querySelectorAll(s)); } catch (e) {}
        const withText = ns.filter((n) => (n.textContent || "").trim());
        return {
          selector: s,
          matched: ns.length,
          withText: withText.length,
          sample: (withText[0] || ns[0] || {}).textContent
            ? (withText[0] || ns[0]).textContent.trim().slice(0, 50)
            : "",
        };
      });
      console.table(rows);
      return rows;
    },

    mark(color) {
      color = color || "red";
      nodes().forEach((n) => {
        n.dataset.utmTestOutline = n.style.outline || "";
        n.style.outline = "2px solid " + color;
      });
      console.log("Outlined", nodes().length, "elements");
    },

    unmark() {
      document.querySelectorAll("[data-utm-test-outline]").forEach((n) => {
        n.style.outline = n.dataset.utmTestOutline;
        delete n.dataset.utmTestOutline;
      });
    },

    hide() {
      nodes().forEach((n) => {
        if (n.dataset.utmTestHidden) return;
        n.dataset.utmTestHidden = n.style.display || "__empty__";
        n.style.display = "none";
      });
      console.log("Hid", document.querySelectorAll("[data-utm-test-hidden]").length, "elements");
    },

    show() {
      document.querySelectorAll("[data-utm-test-hidden]").forEach((n) => {
        n.style.display = n.dataset.utmTestHidden === "__empty__" ? "" : n.dataset.utmTestHidden;
        delete n.dataset.utmTestHidden;
      });
    },
  };

  window.UTM_TEST = UTM_TEST;
  console.log("UTM_TEST ready. Try UTM_TEST.detect(), UTM_TEST.audit(), UTM_TEST.mark(), UTM_TEST.hide().");
})();
