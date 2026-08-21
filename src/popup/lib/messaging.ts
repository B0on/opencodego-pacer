import type {
  UsageSnapshot,
  Settings,
  RefreshInterval,
  BadgeMode,
  ActiveWindow,
} from "../../domain/types.js";

interface WorkerStateResponse {
  ok: boolean;
  snapshot?: UsageSnapshot;
  settings?: Settings;
  error?: string | null;
  signedIn?: boolean;
}

export function sendRefresh(): Promise<unknown> {
  return chrome.runtime.sendMessage({ type: "refresh" });
}

export function sendSetInterval(interval: RefreshInterval): Promise<unknown> {
  return chrome.runtime.sendMessage({ type: "set-interval", interval });
}

export function sendSetBadgeMode(mode: BadgeMode): Promise<unknown> {
  return chrome.runtime.sendMessage({ type: "set-badge-mode", mode });
}

export function sendSetActiveWindow(window: ActiveWindow): Promise<unknown> {
  return chrome.runtime.sendMessage({ type: "set-active-window", window });
}

export async function getState(): Promise<WorkerStateResponse> {
  const res = await chrome.runtime.sendMessage({ type: "get-state" });
  return res as WorkerStateResponse;
}
