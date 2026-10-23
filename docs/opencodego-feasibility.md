# Feasibility — OpenCode Go Pacer

Updated 2026-10-24 for the console v2 API. The original 2026-08-21 pass read the server-rendered `opencode.ai/workspace/{id}/go` page; that page now redirects to the console login, and the console is a SPA that loads usage from its own JSON endpoint.

## Result: FEASIBLE ✅

The console status endpoint at `https://opencode.ai/console/api/go/status` returns Go usage as JSON. It requires no API key, only the existing logged-in session cookie and the workspace ID from the console URL.

## Status payload

A `GET` with `credentials: "include"` and `x-org-id: <workspaceId>` returns `200` and a body shaped like:

```json
{
  "product": "go",
  "access": {
    "startsAt": "2026-10-01T00:00:00.000Z",
    "endsAt": "2026-11-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "meters": {
      "fiveHour": { "usedMicroCents": "120000000", "limitMicroCents": "600000000", "resetsAt": "2026-10-24T05:00:00.000Z", "startsAt": "2026-10-24T00:00:00.000Z" },
      "week":     { "usedMicroCents": "900000000", "limitMicroCents": "1500000000", "resetsAt": "2026-10-27T00:00:00.000Z", "startsAt": "2026-10-20T00:00:00.000Z" },
      "month":    { "usedMicroCents": "1200000000", "limitMicroCents": "3000000000", "resetsAt": "2026-11-01T00:00:00.000Z" }
    }
  }
}
```

### Fields

| Field | Meaning |
|-------|---------|
| `access.meters.fiveHour` | Rolling window (reset ~5h). Mapped to `rolling`. |
| `access.meters.week` | Weekly window. The pacing target. Mapped to `weekly`. |
| `access.meters.month` | Monthly window, display-only. Mapped to `monthly`. |
| `.usedMicroCents` | Window usage in microcents. Decimal string; a JSON number is also accepted. |
| `.limitMicroCents` | Window limit in microcents. Decimal string; a JSON number is also accepted. |
| `.resetsAt` | Absolute ISO-8601 reset instant. |
| `.startsAt` | Optional ISO-8601 window start. `fiveHour.startsAt` can be `null`. Not used by the parser. |

### Key contract notes

- **`resetsAt` is absolute.** `parseGoStatus()` converts it to `resetInSec = max(0, round((Date.parse(resetsAt) - now) / 1000))` for the existing pacing math.
- **Microcents are BigInt-scale.** Parse them as decimal strings so values above `Number.MAX_SAFE_INTEGER` keep their precision.
- **Usage percent is derived.** `usagePercent = round(used * 100 / limit)`, clamped to 0–100. `limit <= 0` yields 0. `status` is `rate-limited` when `used >= limit` and `limit > 0`, otherwise `ok`.
- **Partial payloads degrade per window.** A missing or malformed meter becomes `{status: "unavailable", resetInSec: 0, usagePercent: 0}`.
- **No subscription is a distinct case.** A `200` body of `null`, a null or missing `access`, or no usable meter throws `ParseError` ("No active OpenCode Go subscription").
- **Unauthenticated is a `401`.** The body is `{"_tag":"Unauthorized"}`.

## Auth model

- Service Worker `fetch` with `credentials: "include"`; `host_permissions: ["https://opencode.ai/*"]` attaches the session cookie.
- The workspace ID (`org_...` or `wrk_...`) is sent as the `x-org-id` header.
- `401` or `403` means signed out. No cookie values are read, stored, or logged.
- No API key required.

## Workspace ID resolution

- Current console URLs carry the ID under `/console/`: `https://opencode.ai/console/org_ABC123/go` or `https://opencode.ai/console/wrk_01K46JDFR0E75SG2Q8K172KF3Y`.
- The legacy `/workspace/{wrk_...}/go` path is still accepted for tabs opened before the v2 console.
- Other hosts, `/console/login`, and `/go` without an ID return null.

## Comparison to Ollama Pacer

| Aspect | Ollama Pacer | OpenCode Go Pacer |
|--------|--------------|-------------------|
| URL | `ollama.com/settings` | `opencode.ai/console/api/go/status` |
| Reset info | absolute `data-time` | absolute `resetsAt` |
| Windows | weekly + session | rolling + weekly + monthly |
| Parsing | `% used` text + `data-time` | JSON with microcent totals and `resetsAt` |
| Auth | session cookie | session cookie + `x-org-id` |
