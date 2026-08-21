import type {
  Settings,
  UsageSnapshot,
  BadgeMode,
  RefreshInterval,
  ActiveWindow,
} from "../domain/types.js";

const SNAPSHOT_KEY = "snapshot";
const SETTINGS_KEY = "settings";
const ERROR_KEY = "lastError";

const DEFAULT_SETTINGS: Settings = {
  badgeMode: "remaining",
  refreshInterval: "15min",
  workspaceId: null,
  activeWindow: "monthly",
};

export async function getSnapshot(): Promise<UsageSnapshot | null> {
  const res = await chrome.storage.local.get(SNAPSHOT_KEY);
  const raw = res[SNAPSHOT_KEY] as UsageSnapshot | undefined;
  return raw ?? null;
}

export async function setSnapshot(snapshot: UsageSnapshot): Promise<void> {
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot });
}

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(SETTINGS_KEY);
  const raw = res[SETTINGS_KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getBadgeMode(): Promise<BadgeMode> {
  return (await getSettings()).badgeMode;
}

export async function setBadgeMode(mode: BadgeMode): Promise<void> {
  const s = await getSettings();
  await setSettings({ ...s, badgeMode: mode });
}

export async function getRefreshInterval(): Promise<RefreshInterval> {
  return (await getSettings()).refreshInterval;
}

export async function setRefreshInterval(
  interval: RefreshInterval,
): Promise<void> {
  const s = await getSettings();
  await setSettings({ ...s, refreshInterval: interval });
}

export async function getWorkspaceId(): Promise<string | null> {
  return (await getSettings()).workspaceId;
}

export async function setWorkspaceId(workspaceId: string | null): Promise<void> {
  const s = await getSettings();
  await setSettings({ ...s, workspaceId });
}

export async function getActiveWindow(): Promise<ActiveWindow> {
  return (await getSettings()).activeWindow;
}

export async function setActiveWindow(activeWindow: ActiveWindow): Promise<void> {
  const s = await getSettings();
  await setSettings({ ...s, activeWindow });
}

export async function getLastError(): Promise<string | null> {
  const res = await chrome.storage.local.get(ERROR_KEY);
  const raw = res[ERROR_KEY] as string | undefined;
  return raw ?? null;
}

export async function setLastError(error: string | null): Promise<void> {
  await chrome.storage.local.set({ [ERROR_KEY]: error });
}
