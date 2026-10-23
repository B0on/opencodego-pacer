# Testing Strategy — OpenCode Go Pacer

Follows the Ollama Pacer testing approach: pure domain logic is unit-tested without `chrome.*`; Chrome APIs are isolated in thin layers.

## Layers

### Domain (pure, no mocks)

- `pacing.ts` — weekly pacing math (averagePct, deltaPct, forecast, badge color). Table-driven tests over crafted inputs.
- `reset.ts` — convert `resetInSec` + `now` into absolute cycle bounds; clamp elapsed to window.

### OpenCode client

- `parse.ts` — parse the console status JSON into `PlanUsage`. Use captured fixtures (e.g. `fixtures/go-status.json`) covering active, missing meters, null `access`, and malformed meters.
- `client.ts` — thin; fetch with `x-org-id` and map HTTP/parse failures. Keep network out of tests (inject fetch or test parse only).

### Toolbar

- `badge.ts` — text formatting (remaining/delta/used) and color mapping. Pure.
- `icon.ts` — pixel/ring geometry helpers, pure where possible.

### Storage

- `cache.ts` — load/save helpers around `chrome.storage.local`; mock the `chrome` global.

### Background

- `service-worker.ts` — orchestration (alarm → fetch → math → icon). Test the pure "what to render from snapshot + settings" mapping.

### Popup

- `App.tsx` + components — render from a snapshot fixture; signed-out, loading, ok, error states.

## Coverage

- Target ≥ 80% on `src/domain`, `src/opencode/parse`, `src/toolbar`, `src/storage`.
- UI smoke tests for popup states.

## Tools

- Vitest + `@testing-library/react` + `jsdom`.
- `npm test` runs once; `npm run typecheck` runs `tsc --noEmit`.
