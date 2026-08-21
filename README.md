# OpenCode Go Pacer

Chrome extension that paces your [OpenCode Go](https://opencode.ai) subscription usage against its rolling, weekly, and monthly reset windows.

OpenCode Go tracks usage across three rolling windows (rolling ~5h, weekly 7-day, and monthly). The plan page shows current usage % for each, but not whether your current pace will last until reset. OpenCode Go Pacer fills that gap.

This project is **not affiliated with, endorsed by, or sponsored by** Anomaly / OpenCode. It reads the public `opencode.ai` plan page and can change without notice.

## What it shows

- **Toolbar icon** — elapsed-time ring of the active window (time through the cycle)
- **Toolbar badge** — remaining %, pace delta, or used % (you choose), colored by pace
- **Popup** — Elapsed/Used pills that follow the active window, pace label, forecast, and three clickable window bars (5h / Week / Month) that switch the active window
- **Sync** — every 5 minutes, every 15 minutes (default), or manual only

Data stays on-device. There is no backend and no analytics.

## Install

### Load unpacked (development)

1. Clone this repo and run `npm install` then `npm run build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** and choose the `dist/` folder.
4. Open `opencode.ai` in Chrome and sign in.

## Privacy

OpenCode Go Pacer fetches your signed-in `https://opencode.ai/workspace/{id}/go` page HTML and parses usage locally. It checks for a session cookie (presence only) and never stores or logs the cookie value. Data stays on-device in `chrome.storage.local`.

## Limitations

- Unofficial. The `opencode.ai` plan page structure can change without notice.
- Chrome only (Manifest V3).
- Needs a signed-in `opencode.ai` browser session in Chrome.
- Shows usage percentages only (no dollar metrics).

## Development

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev       # Vite HMR for popup + worker
npm run build     # production build to dist/
npm test          # Vitest
npm run typecheck
```

Product spec: [docs/opencodego-brief.md](docs/opencodego-brief.md). Architecture: [docs/architecture.md](docs/architecture.md). Feasibility: [docs/opencodego-feasibility.md](docs/opencodego-feasibility.md).

## License

[MIT](LICENSE)
