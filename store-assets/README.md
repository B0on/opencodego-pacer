# Chrome Web Store assets

## Required uploads

| File | Size | Use |
|------|------|-----|
| `opencodego-pacer-icon-128.png` | 128 × 128 | Store icon & extension icon |
| `opencodego-pacer-screenshot-640x400.png` | 640 × 400 | Product screenshot (at least one) |

## Optional promotional uploads

| File | Size |
|------|------|
| `opencodego-pacer-promo-small-440x280.png` | 440 × 280 |
| `opencodego-pacer-promo-marquee-1400x560.png` | 1400 × 560 |

## Regenerate PNGs from HTML sources

```bash
npm run render:store-assets
```

Requires Playwright (installed automatically on first run via `npx`).

## Source files

- `icon-128.html` — 128 × 128 store / extension icon
- `store-preview.html` — 640 × 400 screenshot
- `promo-small.html` — small promotional tile
- `promo-marquee.html` — marquee promotional tile
- `store-listing-copy.md` — English listing copy

## Store upload

1. `npm run package` — builds `dist/` and writes `opencodego-pacer-<version>.zip` at the repo root.
2. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item** → upload the zip.
3. Upload the PNGs above under **Store listing** → **Graphic assets**.
4. Paste copy from `store-listing-copy.md`. Set privacy policy URL to the GitHub `PRIVACY.md` link.
5. Match the package version to `package.json` (e.g. `0.1.0`). Submit for review.
