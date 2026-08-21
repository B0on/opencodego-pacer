# Product Brief — OpenCode Go Pacer

Chrome extension that paces [OpenCode Go](https://opencode.ai) subscription usage against its reset windows.

Status: requirements ready. Feasibility verified in-browser on 2026-08-21. Data source and auth model documented in [opencodego-feasibility.md](opencodego-feasibility.md).

This project is **not affiliated with, endorsed by, or sponsored by** Anomaly / OpenCode. The data source is the public `opencode.ai/workspace/{id}/go` page (server-side rendered), not an official API, and can change without notice.

## Problem

OpenCode Go subscriptions are governed by three rolling usage windows that reset automatically:

- **Rolling window** — resets roughly every 5 hours.
- **Weekly window** — resets every 7 days.
- **Monthly window** — resets roughly every 7 days (observed as the longest cadence).

The official page shows current usage % for each window but does not tell the user whether their current pace will last until the next reset. Users only discover they are over-pacing when a window goes `rate-limited`.

## Concept

Port the pacing idea from [Ollama Pacer](../ollama-pacer) and [Usage Pacer (Cursor)](../usage-pacer) to OpenCode Go.

- Read current usage % and reset seconds from the `go` plan page SSR payload.
- Derive the cycle window and reset instant from the data returned by the page.
- Show **used % vs linear average % for today**, plus time left and a depletion forecast.
- The **weekly window is the primary pacing target**. Rolling and monthly windows are secondary indicators.

## Locked decisions (2026-08-21)

- **Weekly window is the primary pacing target.** `computePacing()` runs on the weekly window only. Rolling and monthly windows are display-only indicators.
- **Rolling window** is display-only (short reset, not a pacing target).
- **Monthly window** is display-only unless weekly is unavailable.
- **Reset instants are derived from `resetInSec`** (seconds remaining), converted to an absolute epoch using `Date.now()`. The server does not send an absolute timestamp.
- **Monthly window is assumed to be 30 days.** `MONTHLY_WINDOW_MS = 30d`. Verified against live data (reset ~5.67d remaining at 92% used → elapsed ~81%) — consistent. The page does not expose the absolute cycle start, so this nominal length is used to derive the elapsed-time target for the pacing bar.
- **Free / unsigned plan degrades gracefully.** If no `weeklyUsage` is present, show "no window" state.
- **Single active workspace.** The workspace ID (`wrk_...`) is required in the URL. It is resolved once and cached.
- **Refresh failure backoff is out of MVP.** The 5/15-minute cadence is sufficient.

## Product decisions (locked)

| Area | Decision |
|------|----------|
| Store name | **OpenCode Go Pacer** |
| UI language | English only |
| Platform | Chrome extension, Manifest V3 |
| Data source | `GET https://opencode.ai/workspace/{workspaceID}/go` SSR HTML, using the logged-in Chrome session. Data stays on-device. No backend. |
| Auth | Browser session cookie. **No API key required.** |
| Surfaces | Toolbar **icon** + **badge** + **popup** |
| Toolbar icon | Elapsed-time ring of the **weekly** `averagePct` (0–100% at reset) |
| Badge metric toggle | Settings: **A remaining %** / **B pace delta** / **C used %**, colored by pace. Based on **weekly** window. |
| Pacing model | Linear time with fractional hours/days: `averagePct = elapsed / totalWindow * 100` |
| Pace delta | `delta = actualUsedPct - averagePct`. Positive = ahead of pace (risk). Negative = behind (headroom). |
| Windows | **Weekly** (primary). **Rolling** + **Monthly** (secondary, display-only). |
| Signed-out / stale | No cookie or cache ≥ 24h → badge `—`, grey icon. Cache < 24h → dim last-known badge + ring. |
| Popup | Two pills for weekly (Elapsed / Used), days/hours left, forecast, plus rolling/monthly mini-cards. |
| Sync interval | 5 min / 15 min (default) / Manual. Popup open and Refresh always fetch. |
| Out of MVP | Notifications, history charts, threshold alerts, paid balance tracking, model cost estimates |
| Stack | TypeScript + Vite + React (popup), Manifest V3. Reuse Ollama Pacer skeleton where possible. |

## Pacing math

**The weekly window is the only pacing target.** Rolling and monthly windows are display-only and never drive `deltaPct`, forecast, badge color, or any pacing decision.

### Weekly window (pacing)

- `resetInSec` = seconds until reset (from SSR payload).
- `now` = current epoch ms.
- `cycleEnd` = `now + resetInSec * 1000`.
- `totalWindowMs` = 7 days (604800000 ms). This is a nominal constant because the SSR page does not expose the absolute cycle start.
- `cycleStart` = `cycleEnd - totalWindowMs`.
- `elapsedMs` = `now - cycleStart`, clamped to `[0, totalWindowMs]`.

```
averagePct     = (elapsedMs / totalWindowMs) * 100
actualUsedPct  = weekly usage % parsed from page HTML
deltaPct       = actualUsedPct - averagePct
remainingPct   = max(0, 100 - actualUsedPct)
```

Display reset timestamp as a local calendar date/time (e.g. "Resets Aug 24, 00:00"). Math stays in UTC instants; only display converts to local time.

### Rolling + monthly windows (display-only)

The rolling and monthly mini-cards show used %, time-to-reset, and a tiny progress bar. They do **not** produce a delta, forecast, or badge color.

- Rolling card turns red when `usedPct > elapsedPct` (on track to empty before reset). Display flag only.
- Monthly card is shown for context and also turns red when `usedPct > elapsedPct`.

### Depletion forecast (weekly only)

```
if actualUsedPct <= 0 or elapsedMs <= 0:
  forecast = unknown
else:
  projectedEmptyAt = cycleStart + (elapsedMs * (100 / actualUsedPct))
  if projectedEmptyAt < cycleEnd:
    forecast = empties_early, hours/days early
  else:
    forecast = lasts_through_reset
```

### Badge color (weekly only)

- Green: `deltaPct <= 0`
- Yellow: `0 < deltaPct <= 10`
- Red: `deltaPct > 10`
- Escalate one step if forecast empties before reset.

## Data acquisition

Source: `https://opencode.ai/workspace/{workspaceID}/go` (server-side rendered HTML).

Not affiliated with OpenCode. This is reverse-engineered from the public plan page and can change without notice.

### Auth

- Chrome extension reads **presence only** with `chrome.cookies.getAll({ url: "https://opencode.ai/" })`. It does not store or log cookie values.
- Service Worker fetches the plan page with `credentials: "include"`. `host_permissions: ["https://opencode.ai/*"]` attaches the session cookie automatically.

### Parsing strategy

1. Extract the workspaceID from the URL or a saved setting.
2. Parse the SSR HTML for the embedded usage JSON containing `rollingUsage`, `weeklyUsage`, and `monthlyUsage`, each with `status`, `resetInSec`, and `usagePercent`.
3. Detect whether the user is subscribed to Go (look for "OpenCode Go" or the usage payload).

## Privacy

- Local-only. No telemetry, no third-party analytics, no remote backend.
- Session cookie is used only to call OpenCode's own site.
- Cached usage snapshots stay in `chrome.storage.local`.
- Cookie values are never persisted or logged.

## Non-goals (this version)

- Tracking Cursor, Claude, ChatGPT, or other products.
- API key authentication.
- Local model usage (only OpenCode Go).
- Notifications, history charts, threshold alerts.
- Localized UI (English only).

## References

- OpenCode plan page: `https://opencode.ai/workspace/{id}/go`
- Sibling products: Usage Pacer (Cursor) and Ollama Pacer.
- Feasibility doc: [opencodego-feasibility.md](opencodego-feasibility.md)
