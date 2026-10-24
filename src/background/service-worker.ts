import {
  getSnapshot,
  setSnapshot,
  getSettings,
  setSettings,
  setBadgeMode,
  setActiveWindow,
  getLastError,
  setLastError,
  setWorkspaceId,
} from "../storage/cache.js";
import { fetchPlanUsage, workspaceIdFromUrl, OPCODE_HOST } from "../opencode/client.js";
import {
  computePacing,
  forecastFor,
  badgeColor,
  windowLengthMs,
  type WindowKey,
} from "../domain/pacing.js";
import type { Settings, UsageSnapshot } from "../domain/types.js";
import { badgeText, badgeColorHex } from "../toolbar/badge.js";
import { drawRingImageData } from "../toolbar/icon.js";
import {
  MESSAGE_GET_STATE,
  MESSAGE_REFRESH,
  MESSAGE_SET_ACTIVE_WINDOW,
  MESSAGE_SET_BADGE_MODE,
  MESSAGE_SET_INTERVAL,
  type RefreshResponse,
} from "./messages.js";

const STALE_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS: Record<Settings["refreshInterval"], number | null> = {
  "5min": 5 * 60 * 1000,
  "15min": 15 * 60 * 1000,
  manual: null,
};

/** Find a workspace ID from an open opencode.ai tab, if any. */
async function detectWorkspaceId(): Promise<string | null> {
  const tabs = await chrome.tabs
    .query({ url: `${OPCODE_HOST}/*` })
    .catch(() => [] as chrome.tabs.Tab[]);
  for (const tab of tabs) {
    if (!tab.url) continue;
    const workspaceId = workspaceIdFromUrl(tab.url);
    if (workspaceId) return workspaceId;
  }
  return null;
}

async function refresh(): Promise<RefreshResponse> {
  const settings = await getSettings();
  let workspaceId = settings.workspaceId;

  // Auto-detect the workspace ID from an open opencode.ai tab if unset.
  if (!workspaceId) {
    workspaceId = await detectWorkspaceId();
    if (workspaceId) {
      await setWorkspaceId(workspaceId);
    }
  }

  if (!workspaceId) {
    return {
      ok: false,
      signedIn: false,
      error: "Open the OpenCode console (opencode.ai/console) first.",
    };
  }

  const result = await fetchPlanUsage(workspaceId);
  if (!result.ok || !result.usage) {
    await setLastError(result.error);
    return { ok: false, signedIn: result.signedIn, error: result.error };
  }

  const snapshot = { plan: result.usage, fetchedAt: Date.now() };
  await setSnapshot(snapshot);
  await setLastError(null);
  await renderToolbarFrom(snapshot, settings);
  return { ok: true, signedIn: true, snapshot };
}

/** Render icon + badge from the latest stored snapshot/settings. */
export async function renderToolbar(): Promise<void> {
  const snapshot = await getSnapshot();
  const settings = await getSettings();
  await renderToolbarFrom(snapshot, settings);
}

async function renderToolbarFrom(
  snapshot: UsageSnapshot | null,
  settings: Settings,
): Promise<void> {
  const now = Date.now();
  const stale = !snapshot || now - snapshot.fetchedAt >= STALE_MS;

  if (!snapshot || stale) {
    await setEmptyIcon();
    return;
  }

  const active = settings.activeWindow ?? "monthly";
  const win = snapshot.plan[active as WindowKey];
  const totalMs = windowLengthMs(active as WindowKey, win);
  const pace = computePacing(win.usagePercent, win.resetInSec, now, totalMs);
  const forecast = forecastFor(pace, totalMs);
  const color = badgeColor(pace.deltaPct, forecast);

  await chrome.action.setIcon({ imageData: drawRingImageData(16, pace.averagePct) });
  await chrome.action.setBadgeText({ text: badgeText(settings.badgeMode, pace) });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColorHex(color) });
}

async function setEmptyIcon(): Promise<void> {
  await chrome.action.setIcon({ imageData: drawRingImageData(16, 0) });
  await chrome.action.setBadgeText({ text: "—" });
  await chrome.action.setBadgeBackgroundColor({ color: "#9ca3af" });
}

function setAlarm(interval: Settings["refreshInterval"]): void {
  const ms = INTERVAL_MS[interval];
  if (ms == null) {
    chrome.alarms.clear("refresh");
    return;
  }
  chrome.alarms.create("refresh", { periodInMinutes: ms / 60000 });
}

async function applyInterval(interval: Settings["refreshInterval"]): Promise<void> {
  const settings = await getSettings();
  await setSettings({ ...settings, refreshInterval: interval });
  setAlarm(interval);
}

chrome.runtime.onInstalled.addListener(async () => {
  await applyInterval((await getSettings()).refreshInterval);
  await refresh();
});

chrome.runtime.onStartup.addListener(() => {
  void renderToolbar();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh") void refresh();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((res) => sendResponse(res))
    .catch((e) => sendResponse({ ok: false, error: (e as Error).message }));
  return true;
});

async function handleMessage(message: unknown): Promise<unknown> {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return { ok: false, error: "unknown message" };
  }
  const m = message as { type: string };
  switch (m.type) {
    case MESSAGE_REFRESH:
      return refresh();
    case MESSAGE_SET_INTERVAL: {
      const interval = (m as unknown as { interval: Settings["refreshInterval"] }).interval;
      await applyInterval(interval);
      return { ok: true };
    }
    case MESSAGE_SET_BADGE_MODE: {
      const mode = (m as unknown as { mode: Settings["badgeMode"] }).mode;
      await setBadgeMode(mode);
      await renderToolbar();
      return { ok: true };
    }
    case MESSAGE_SET_ACTIVE_WINDOW: {
      const win = (m as unknown as { window: Settings["activeWindow"] }).window;
      await setActiveWindow(win);
      await renderToolbar();
      return { ok: true };
    }
    case MESSAGE_GET_STATE: {
      const snapshot = await getSnapshot();
      const settings = await getSettings();
      const error = await getLastError();
      return { ok: true, snapshot, settings, error, signedIn: snapshot != null };
    }
    default:
      return { ok: false, error: "unknown message type" };
  }
}
