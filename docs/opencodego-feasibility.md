# Feasibility — OpenCode Go Pacer

Verification performed in-browser on 2026-08-21 to confirm that OpenCode Go subscription usage can be read from the logged-in browser session, and to capture the exact data contract.

## Result: FEASIBLE ✅

The OpenCode Go plan page at `https://opencode.ai/workspace/{workspaceID}/go` is **server-side rendered (SSR)** and embeds the usage data directly in the HTML. This mirrors the Ollama Pacer approach (fetch page HTML, parse locally) and requires no API key, only the existing logged-in session cookie.

## Observed SSR payload

A `GET` to the plan page returns HTML containing a script payload of roughly this shape (verified live):

```js
{mine: true, useBalance: false, allowTraining: false, region: ["us","eu","sg","cn"],
 rollingUsage: {status: "ok",           resetInSec: 18000,  usagePercent: 0   },
 weeklyUsage:  {status: "rate-limited", resetInSec: 204740, usagePercent: 100 },
 monthlyUsage: {status: "ok",           resetInSec: 494831, usagePercent: 92  }}
```

### Fields

| Field | Meaning |
|-------|---------|
| `rollingUsage` | Rolling window (reset ~5h). |
| `weeklyUsage` | Weekly window. The pacing target. |
| `monthlyUsage` | Monthly window, display-only. |
| `.status` | `"ok"` or `"rate-limited"`. |
| `.resetInSec` | **Seconds remaining** until the window resets. |
| `.usagePercent` | Percentage of the window used (0–100). |

### Key contract notes

- **`resetInSec` is seconds-remaining, not an absolute timestamp.** The extension must convert to an absolute epoch via `now + resetInSec * 1000`. This differs from Ollama's `data-time` (absolute ISO).
- **Total window length is a nominal constant (7 days for weekly).** The page does not expose the cycle start; the extension derives `cycleStart = cycleEnd - totalWindowMs`.
- The workspace ID (`wrk_...`) is required in the URL path. It must be resolved (e.g. from the workspace URL) and cached.
- Go subscription detection: the page renders "OpenCode Go" and exposes the usage payload. If the user is not subscribed, the payload/segments may be absent → degrade gracefully.

## Auth model

- Same as Ollama Pacer: Service Worker `fetch` with `credentials: "include"`, `host_permissions: ["https://opencode.ai/*"]` attaches the session cookie.
- Cookie presence checked with `chrome.cookies.getAll({ url: "https://opencode.ai/" })` — presence only, never stored.
- No API key required.

## Comparison to Ollama Pacer

| Aspect | Ollama Pacer | OpenCode Go Pacer |
|--------|--------------|-------------------|
| URL | `ollama.com/settings` | `opencode.ai/workspace/{id}/go` |
| Reset info | absolute `data-time` | `resetInSec` (seconds remaining) |
| Windows | weekly + session | rolling + weekly + monthly |
| Parsing | `% used` text + `data-time` | SSR JSON with `usagePercent`/`resetInSec` |
| Auth | session cookie | session cookie |
