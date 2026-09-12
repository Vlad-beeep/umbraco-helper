# Chrome Web Store — submission pack

Everything you need to paste/upload in the Developer Dashboard.

## 1. Package to upload
`umbraco-helper-1.0.0.zip` (produced by `package.py` — dev files excluded).

## 2. Store listing fields

**Name:** Umbraco Helper

**Summary (max 132 chars):**
> Hide, button-toggle, or show tooltips and help text on Umbraco backoffice pages to free up screen space.

**Category:** Developer Tools (or Productivity)

**Detailed description:**
```
Free up space in the Umbraco backoffice.

Umbraco Tooltip Manager hides the descriptive help text and tooltips on Umbraco
editor pages so you can focus on your content. Choose per site:

• Completely hide tooltips
• Replace them with a small “ⓘ” button you can click on demand
• Or leave them fully visible

It also adds a few optional quality-of-life tweaks to the Umbraco backoffice:
• Press ESC to close open side panels/overlays (with an “ESC” hint on the button)
• Press Enter to trigger the primary action (Submit / Save and publish — with a “↵” hint)
• Remove the slide/fade animation when side panels open
• Shrink and auto-dismiss the green/yellow publish notifications

Everything is configurable in Settings, and it only ever runs on pages whose URL
contains “umbraco”. No data leaves your browser — there are no servers, no
tracking, and no analytics.
```

**Language:** English

## 3. Graphics you must supply (store requires these — I can't generate them)

| Asset | Size | Required |
|-------|------|----------|
| Store icon | 128×128 PNG | Yes (bundled icon works, but a nicer one is recommended) |
| Screenshot(s) | 1280×800 or 640×400 PNG/JPEG | Yes — at least 1, up to 5 |
| Small promo tile | 440×280 PNG | Optional but recommended |
| Marquee promo tile | 1400×560 PNG | Optional |

Good screenshots to capture: the tooltip “ⓘ” button on a field, the Settings page,
the ESC/↵ button hints, and the half-width notification.

## 4. Privacy tab (in the dashboard)

- **Single purpose:**
  > Hide or toggle tooltip/help text and adjust minor UI behaviours on Umbraco backoffice pages.

- **Permission justifications:**
  - `storage` — "Save the user's settings and per-site enable list."
  - `activeTab` — "Read the active tab's URL in the popup to show whether the current site is a managed Umbraco site."
  - Host access (`*://*/umbraco*`) — "Umbraco backoffices live at the /umbraco path on any domain, so the script must run on that path across sites. It only acts on URLs containing 'umbraco' and never on any other page."

- **Data usage — certify all three:**
  - Not sold to third parties ✔
  - Not used/transferred for purposes unrelated to the item's single purpose ✔
  - Not used to determine creditworthiness / lending ✔

- **Data collection:** the extension stores settings and site hostnames **locally
  only**; nothing is transmitted. Declare "No, I do not collect user data" if the
  form treats local-only `storage.sync` as non-collection, or disclose "Website
  content / Web history" as **stored locally, not transmitted** if asked.

- **Privacy policy URL:** host `PRIVACY.md` somewhere public (GitHub Pages, a gist,
  your site) and paste the link. A privacy policy URL is required because the
  extension can access website content.

## 5. Distribution
- **Visibility:** Public, Unlisted (link-only), or Private (specific accounts). For
  an internal team tool, **Unlisted** or **Private** is usually the right choice.
- **Regions:** all, or restrict as needed.
