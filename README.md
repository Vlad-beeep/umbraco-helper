# Umbraco Tooltip Manager (Chrome extension)

Hides / toggles the tooltip & help text on **Umbraco backoffice** pages to free up screen space.
Works in any Chromium browser (Chrome, Edge, Brave). Manifest V3.

## What it does

- Runs on every page but only **acts** when the page is Umbraco:
  - URL contains `/umbraco`, **or**
  - the page has Umbraco DOM markers (`umb-app`, `#umbracoMainWrapper`, …), **or**
  - the domain is in your managed list.
- When an Umbraco site is auto-detected, its domain is **added to the managed list** automatically. You can **disable** the extension on that site from the popup or Settings.
- Three tooltip modes (global default = **Show button**, overridable per site):
  1. **Completely hide** – help text removed for maximum space.
  2. **Show button** – help text is replaced by an `ⓘ Show tooltip` button; clicking it pops up the original text.
  3. **Always show** – leaves the page untouched.
- Optionally strips native `title="…"` hover tooltips too.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder (`Portal Extention`).
4. Pin the extension; click its icon on an Umbraco page.

## Usage

- **Popup** (toolbar icon): shows the current site, an enable/disable switch, and a per-site mode override.
- **Settings** (popup → “All settings & sites”, or right-click → Options): global default mode, auto-detect toggle, native-title toggle, the managed-sites table, and the **tooltip selectors**.

## Target portal note (important)

The live portal at `portal-upg.xpt-spx-prt-acc.xpand.local` is **not** an Umbraco
backoffice — it's an **Xpand Portal** app built on **Kendo UI** (Shipex theme).
The extension has been extended to detect it (via `<html id="Main">`, the
`xpage-*` body class, and `xpand-*` / Kendo markers) and ships with Xpand-Portal
tooltip selectors (`.block-header-description`, `.menu-item__tooltip`,
`.unpinned-icon-tooltip-text`, `.k-tooltip-content`, `.icon-information`,
`a.tooltip`). The original Umbraco selectors are kept so it still works on Umbraco
sites. Use `main.js` (below) to preview/tune selectors on any page.

## Tuning the selectors

The exact CSS classes vary by page and app version. The extension ships with
sensible defaults but you may need to adjust them:

1. On the Umbraco page, right-click a piece of help/tooltip text → **Inspect**.
2. Note its class (e.g. `.umb-property-description`).
3. Settings → **Tooltip selectors** → add it (one selector per line) → **Save**.

Changes apply live — no reload needed.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 config |
| `defaults.js` | shared default settings |
| `background.js` | seeds defaults on install |
| `content.js` / `content.css` | detection + tooltip hiding/button logic (SPA-aware via MutationObserver) |
| `popup.*` | quick per-site control |
| `options.*` | full settings & site management |
| `main.js` | standalone console test harness (`UTM_TEST.*`) for auditing/previewing selectors on a live page — not loaded by the extension |

## Roadmap / future settings

Architecture already supports per-site mode overrides and an editable selector list. Planned: import/export config, per-field granularity, keyboard shortcut toggle.
