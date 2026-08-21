# Chrome Web Store Listing Copy

## Name

OpenCode Go Pacer

## Short description

Pace your OpenCode Go subscription usage against rolling, weekly, and monthly reset windows.

## Full description

OpenCode Go Pacer helps OpenCode Go subscribers pace their usage across rolling (~5h), weekly, and monthly reset windows. It reads usage from your signed-in opencode.ai plan page, then shows elapsed time versus usage, pace delta, time left, and a depletion forecast in the toolbar and popup.

Clickable window bars let you switch the active view between 5h, Week, and Month. The toolbar ring and badge follow whichever window you select.

Data stays on-device; there is no backend or analytics. The extension uses your existing opencode.ai browser session only to fetch the plan page HTML.

This project is not affiliated with, endorsed by, or sponsored by Anomaly / OpenCode.

## Category

Developer Tools

## Language

English

## Privacy policy URL

https://github.com/B0on/opencodego-pacer/blob/main/PRIVACY.md

## Single purpose

Display OpenCode Go subscription usage pacing against the user's rolling, weekly, and monthly reset windows using data from opencode.ai.

## Permission justifications

- `storage` — cache the latest usage snapshot and user settings (badge mode, sync interval, active window).
- `cookies` — detect whether an opencode.ai session exists (presence only; values are never read or stored).
- `alarms` — optional background refresh on a 5- or 15-minute cadence.
- `tabs` — auto-detect the workspace ID from an open opencode.ai tab.
- `https://opencode.ai/*` — fetch the signed-in plan page HTML that contains usage percentages and reset times.
