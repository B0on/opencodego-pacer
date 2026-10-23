# OpenCode Go Pacer Privacy Policy

Last updated: 2026-08-22

OpenCode Go Pacer is a Chrome extension that displays OpenCode Go subscription usage pacing against rolling (~5h), weekly, and monthly reset windows.

This project is not affiliated with, endorsed by, or sponsored by Anomaly / OpenCode.

## Data handled

OpenCode Go Pacer handles the following data locally on the user's machine:

- The **presence** of an existing `opencode.ai` session cookie, used only to infer sign-in state when a fetch fails.
- Usage data parsed from the signed-in user's `https://opencode.ai/console/api/go/status` response (usage percentages, reset times, pace deltas).
- Local extension settings and the latest usage snapshot.

OpenCode Go Pacer does not read, log, or store the **value** of session cookies. It never sends those cookies to any server other than `opencode.ai` when fetching the plan page.

## Data transmission

OpenCode Go Pacer requests `https://opencode.ai/console/api/go/status` using the browser's existing session credentials. No data is sent to an OpenCode Go Pacer server. There is no analytics, telemetry, advertising, or third-party tracker.

## Data retention and deletion

The latest usage snapshot and extension settings remain in Chrome's local extension storage until the user clears the extension's data or uninstalls the extension. The extension does not maintain a separate account or server-side database.

## Permissions

The Chrome extension requests:

- `storage` — settings and the latest usage snapshot
- `cookies` — detect whether an `opencode.ai` session exists (presence only)
- `alarms` — optional background refresh on a 5- or 15-minute cadence
- `tabs` — auto-detect the workspace ID from an open opencode.ai tab
- host access to `https://opencode.ai/*` — fetch the signed-in console usage status

## Changes

This policy may be updated when the extension's data handling changes. The latest version lives in this file on the default branch.

## Contact

Open a GitHub issue in this repository.
