#!/usr/bin/env python3
"""Build a Chrome Web Store upload zip containing only the shippable files.

Usage:  python package.py
Output: umbraco-tooltip-manager-<version>.zip  (next to this script)
"""
import json
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))

# Files that make up the actual extension (everything else is dev-only).
INCLUDE = [
    "manifest.json",
    "background.js",
    "defaults.js",
    "content.js",
    "content.css",
    "popup.html",
    "popup.css",
    "popup.js",
    "options.html",
    "options.css",
    "options.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

# Explicitly NOT shipped: README.md, PRIVACY.md, STORE_LISTING.md, main.js, this script.

def main():
    with open(os.path.join(HERE, "manifest.json"), encoding="utf-8") as f:
        version = json.load(f)["version"]
    out = os.path.join(HERE, f"umbraco-helper-{version}.zip")
    if os.path.exists(out):
        os.remove(out)

    missing = [p for p in INCLUDE if not os.path.exists(os.path.join(HERE, p))]
    if missing:
        raise SystemExit("Missing files: " + ", ".join(missing))

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in INCLUDE:
            z.write(os.path.join(HERE, rel), rel)

    print(f"Wrote {out}")
    print(f"{len(INCLUDE)} files packaged.")

if __name__ == "__main__":
    main()
