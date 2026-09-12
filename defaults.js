// Shared default settings for Umbraco Tooltip Manager.
// Loaded both as a content script and via <script> in popup/options pages.
(function () {
  const UTM_DEFAULTS = {
    // Bump this whenever a shipped "system" list below (selectors / labels /
    // overlay selectors) changes, so existing installs pick up the new values
    // on reload instead of keeping their frozen stored copy. See background.js.
    defaultsVersion: 5,

    // Global tooltip mode: "button" | "hide" | "show"
    //   button -> replace tooltip/help text with an "ⓘ Show tooltip" button
    //   hide   -> completely hide tooltip/help text
    //   show   -> leave everything as-is (extension inactive on visuals)
    globalMode: "button",

    // Auto-activate on any page that looks like Umbraco (URL /umbraco or DOM markers).
    autoDetect: true,

    // Also strip native title="..." hover tooltips when active (hide/button modes).
    handleTitles: true,

    // CSS selectors considered "tooltips / help text". Tunable in options.
    selectors: [
      // --- Xpand Portal / Kendo UI (e.g. portal-upg.xpt-spx-prt-acc.xpand.local) ---
      ".block-header-description",    // descriptive help text under section/field headers
      ".menu-item__tooltip",          // collapsed left-nav hover labels
      ".unpinned-icon-tooltip-text",  // filter "Pin filter" hover hints
      ".k-tooltip-content",           // Kendo tooltip bubble text
      ".icon-information",            // ⓘ info trigger icons next to fields/headers
      "a.tooltip",                    // anchor-style tooltips
      // NOTE: ".alert-description" is intentionally NOT listed — those are real
      // alert dropdown items (data), not help text.

      // --- Umbraco backoffice (kept so the extension still works on Umbraco sites) ---
      ".umb-property .control-header small",
      ".umb-property small.text-muted",
      ".umb-property-description",
      ".umb-el-wrap .help-block",
      ".control-description",
      ".umb-control-group small",
      ".help-inline",
      ".help-block",
      "umb-tooltip"
    ],

    // Close the top-most open sidebar/overlay when Escape is pressed by finding
    // and clicking its dismiss button (Umbraco infinite-editing panels, the
    // custom "Group filters" builder, pickers, etc. don't close on native ESC).
    escClose: true,

    // Button text / labels considered a "close/dismiss" control, in priority order.
    // "Discard" is last so normal dialogs still prefer Close/Cancel, but the
    // "Discard changes?" prompt (Stay / Discard) is dismissed with ESC too.
    escCloseLabels: ["Close", "Cancel", "Discard"],

    // Containers treated as a dismissable overlay/sidebar. ESC only acts when one
    // of these is actually open, so a stray "Cancel" button on the page is never
    // clicked by accident.
    // NB: only containers that exist *when a popup is actually open* — the bare
    // ".umb-editor" is intentionally excluded (it's the always-present main editor).
    overlaySelectors: [
      ".umb-editor--infiniteMode",
      ".umb-overlay",
      ".umb-modalcolumn"
    ],

    // Press Enter to click the primary action button (and show a "↵" marker on it).
    // Ignored while typing in a field or when a modifier key is held.
    enterSubmit: true,

    // Buttons Enter should press, in priority order. An open overlay's button
    // (e.g. "Submit") wins over the main editor's ("Save and publish...").
    enterButtonLabels: ["Submit", "Save and publish", "Save and publish..."],

    // Remove the slide/fade animation when Umbraco side panels/overlays open.
    disableSidebarAnimation: true,

    // Compact Fields View: remove the margin under each field caption and place
    // the tooltip "ⓘ" button inline with the caption, so fields take less space.
    compactSpacing: true,

    // Remove the vertical padding on Content tree list items (tighter tree).
    compactTree: true,

    // Publish/save toast notifications (green success / yellow warning).
    // Halve their width (height grows to fit if text wraps).
    notificationHalfWidth: true,
    // Auto-dismiss them after this many ms. "" = leave Umbraco's default timing.
    notificationTimeout: 2000,

    // Elements whose open/close transition+animation is killed by the setting
    // above. Covers infinite-editing side panels, their backdrop, and the
    // centered modal overlays (e.g. the "Discard changes?" dialog).
    animSelectors: [
      ".umb-editor",
      ".umb-editor--infiniteMode",
      ".umb-editor--animating",
      ".umb-editor__overlay",
      ".umb-editor__inner",
      ".umb-editor-container",
      ".umb-overlay",
      ".umb-overlay__inner",
      ".umb-modalcolumn",
      ".ng-animate",
      ".ng-enter",
      ".ng-enter-active",
      ".ng-leave",
      ".ng-leave-active"
    ],

    // Per-site config: { "host": { enabled: true, detected: true, mode: null|"button"|"hide"|"show" } }
    sites: {}
  };

  if (typeof window !== "undefined") window.UTM_DEFAULTS = UTM_DEFAULTS;
  if (typeof self !== "undefined") self.UTM_DEFAULTS = UTM_DEFAULTS;
})();
