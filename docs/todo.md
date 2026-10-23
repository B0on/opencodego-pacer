# Todo — OpenCode Go Pacer

Status legend: `[ ]` pending, `[x]` done.

## Requirements / planning
- [x] Review sibling project (Ollama Pacer) architecture and data model
- [x] Verify OpenCode Go data source feasibility in-browser
- [x] Write product brief (`opencodego-brief.md`)
- [x] Write feasibility doc (`opencodego-feasibility.md`)
- [x] Write architecture doc (`architecture.md`)
- [x] Write testing strategy (`testing-strategy.md`)

## Implementation
- [x] Scaffold project (package.json, tsconfig, vite, manifest)
- [x] Domain layer (types, pacing math, reset inference)
- [x] OpenCode client layer (fetch + parse status JSON)
- [x] Storage/cache layer
- [x] Toolbar layer (icon + badge)
- [x] Background service worker (alarm + orchestration)
- [x] Popup React UI
- [x] Tests + build verification
- [x] Store assets + packaging

## Later (out of MVP)
- Notifications / threshold alerts
- Daily usage history chart
- Refresh failure backoff
- Account / workspace switcher
- Per-model usage breakdown
