# 📖 User Story — Umbraco Helper

## 👤 Who & why

> As a **content editor / developer** who spends the whole day in the Umbraco backoffice,
> I want the interface to be **more compact, quieter, and faster**,
> so that I **click, scroll, and get distracted less** by clutter.

---

## 💡 What was planned

The original idea was small:

- 💬 Hide the tooltip/help text that eats space under every field.
- 🔀 Give a choice: hide it, show it behind a button, or leave it as is.
- 🌐 Only activate on Umbraco pages.

Along the way the scope grew — it became clear what actually wastes the most time and space.

---

## ✅ What's done (v1.1.0)

**Tooltips**
- 💬 Three modes: *hide* / *`ⓘ` button* / *always show*.
- 🎯 The `ⓘ` button sits inline with the field caption (Compact Fields View).

**Keyboard shortcuts**
- ⎋ `Esc` closes sidebars and dialogs, including *Discard changes*.
- ↵ `Enter` presses the primary action — *Submit / Save and publish*.
- 🏷️ Buttons show `ESC` and `↵` hints.

**Less visual noise**
- ⚡ Turn off the sidebar open/close animation.
- 📏 Compact fields and a compact content tree.
- 🔔 Publish notifications are narrower and auto-dismiss after a couple of seconds.

**Control**
- 🖱️ Popup: enable/disable per site + every toggle in one click.
- ⚙️ Full options page: managed sites, editable CSS selectors, timings.
- 🔒 Everything stored locally (Chrome sync) — no servers, no tracking.

---

## 🔮 What's next

- 🏪 Publish to the **Chrome Web Store** (currently installed as unpacked).
- 🎚️ One-click presets: *"Compact"* / *"Default"*.
- 📤 Import / export settings — and a shared config for the whole team.
- ⌨️ Customizable keyboard shortcuts.
- 🌙 Dark popup theme that follows the backoffice theme.
- 🧭 Support for a non-standard Umbraco path (not only `/umbraco`).
- 🔎 Auto-detect tooltip selectors — less manual tuning.
- 🆕 Support for the new **Umbraco v14+** backoffice (web components).

---

## 📌 Status

🟢 Ready for internal use · 🟡 preparing for Chrome Web Store publication.
