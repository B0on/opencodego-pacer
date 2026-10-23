# Contributing

Thanks for your interest in OpenCode Go Pacer.

## Development

- Requires Node.js 22+ and npm.
- Run `npm install`, `npm test`, `npm run typecheck`, `npm run build`.

## Conventions

- TypeScript, strict mode. All new code should pass `npm run typecheck`.
- Follow the layered architecture in [docs/architecture.md](docs/architecture.md):
  - `src/domain/` — pure logic, no `chrome.*`.
  - `src/opencode/` — console status API fetch + JSON parse.
  - `src/storage/` — chrome.storage helpers.
  - `src/toolbar/`, `src/background/`, `src/popup/` — Chrome/UI surfaces.
- Add tests alongside code (target ≥ 80% on pure layers). Run with `npm test`.

## Data contract note

The extension reads `GET opencode.ai/console/api/go/status` (with the
`x-org-id` header), the endpoint the OpenCode console itself uses. It is not an
official API and can change without notice. If it breaks, update the
parser in `src/opencode/parse.ts` and its fixtures in `src/opencode/fixtures/`.
