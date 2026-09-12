# 🧩 Umbraco Helper

A Chrome extension that declutters the **Umbraco backoffice** — hide tooltips, tighten spacing, and add keyboard shortcuts so you can work faster.

> ✅ Runs **only** on pages whose URL contains `umbraco`.
> 🔒 Everything stays in your browser — no servers, no tracking.

---

## ✨ What it does

| | Feature |
|---|---|
| 💬 | **Tooltips** — hide the help text under fields, or swap it for a small `ⓘ` button |
| ⌨️ | **Shortcuts** — `Esc` closes sidebars & dialogs (incl. *Discard changes*), `Enter` runs *Submit / Save and publish* |
| ⚡ | **No animation** — side panels open instantly instead of sliding |
| 📏 | **Compact view** — tighter field spacing and a denser content tree |
| 🔔 | **Tidy notifications** — the green/yellow publish toasts are smaller and auto-dismiss |

---

## 🚀 Install

1. Download this folder (or `git clone`).
2. Open `chrome://extensions` → turn on **Developer mode** (top-right).
3. Click **Load unpacked** → select the folder.
4. Open any Umbraco page — it activates automatically. Pin the icon for quick access.

---

## ⚙️ How to use

Click the toolbar icon on an Umbraco page. In the popup you can, **per site**:

- Enable / disable the extension
- Pick the tooltip mode
- Toggle shortcuts, sidebar animation, compact fields, compact tree

Need more? **All settings & sites →** opens the full options page (managed sites, editable CSS selectors, timings).

---

## 🔒 Privacy

Stores only your settings and the Umbraco hostnames you visit — locally, via Chrome sync. Nothing leaves your browser. → [PRIVACY.md](PRIVACY.md)

---

## 🛠️ Build (for the Chrome Web Store)

```bash
python package.py
```

Creates `umbraco-helper-<version>.zip` with only the files Chrome needs.

---

<sub>Made for people who live in the Umbraco backoffice. 🚚</sub>
