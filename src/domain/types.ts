export type WindowStatus = "ok" | "rate-limited" | "unavailable";

/** Usage for a single reset window, as parsed from the console status payload. */
export interface UsageWindow {
  status: WindowStatus;
  /** Seconds remaining until the window resets. */
  resetInSec: number;
  /** Percentage of the window used (0–100). */
  usagePercent: number;
}

/** Raw usage payload parsed from the OpenCode console status endpoint. */
export interface PlanUsage {
  rolling: UsageWindow;
  weekly: UsageWindow;
  monthly: UsageWindow;
}

/** Snapshot persisted to chrome.storage.local after a successful parse. */
export interface UsageSnapshot {
  plan: PlanUsage;
  fetchedAt: number;
}

export type BadgeMode = "remaining" | "delta" | "used";
export type RefreshInterval = "5min" | "15min" | "manual";
export type ActiveWindow = "rolling" | "weekly" | "monthly";

export interface Settings {
  badgeMode: BadgeMode;
  refreshInterval: RefreshInterval;
  workspaceId: string | null;
  activeWindow: ActiveWindow;
}

export interface PaceView {
  /** Elapsed fraction of the weekly window, 0–100. */
  averagePct: number;
  /** Actual weekly usage %, 0–100. */
  actualUsedPct: number;
  /** deltaPct = actualUsedPct - averagePct. Positive = ahead of pace. */
  deltaPct: number;
  /** remainingPct = max(0, 100 - actualUsedPct). */
  remainingPct: number;
  /** Absolute epoch ms when the weekly window resets. */
  resetAt: number;
  /** Days/hours until reset (floating). */
  hoursToReset: number;
}
