import type { PaceView, UsageWindow } from "./types";
import { WEEKLY_WINDOW_MS, cycleBounds, elapsedFraction } from "./reset.js";

export type WindowKey = "rolling" | "weekly" | "monthly";

export const WINDOW_MS: Record<WindowKey, number> = {
  rolling: 5 * 60 * 60 * 1000, // 5 hours
  weekly: WEEKLY_WINDOW_MS, // 7 days
  monthly: 30 * 24 * 60 * 60 * 1000, // fallback only (real month may be 28–31d)
};

/** Real window length from the payload, falling back to the nominal length. */
export function windowLengthMs(key: WindowKey, w: UsageWindow): number {
  return Number.isFinite(w.windowMs) && w.windowMs > 0 ? w.windowMs : WINDOW_MS[key];
}

export const WINDOW_LABEL: Record<WindowKey, string> = {
  rolling: "5h",
  weekly: "Week",
  monthly: "Month",
};

export type ForecastKind = "unknown" | "empties_early" | "lasts_through_reset";

export interface Forecast {
  kind: ForecastKind;
  /** Epoch ms when the window would empty at the current pace (null if unknown). */
  projectedEmptyAt: number | null;
  /** Hours early the window would empty, if empties_early. */
  hoursEarly: number | null;
}

/**
 * Linear pacing for any window. `usagePercent` is the actual usage, `resetInSec`
 * is seconds remaining, and `totalMs` is the window length used to derive the
 * elapsed-time target (averagePct). Positive deltaPct = ahead of pace.
 */
export function computePacing(
  usagePercent: number,
  resetInSec: number,
  nowMs: number,
  totalMs: number = WEEKLY_WINDOW_MS,
): PaceView {
  const bounds = cycleBounds(resetInSec, nowMs, totalMs);
  const elapsed = elapsedFraction(bounds.start, bounds.end, nowMs);
  const averagePct = elapsed * 100;
  const actualUsedPct = Math.min(100, Math.max(0, usagePercent));
  const deltaPct = actualUsedPct - averagePct;
  const remainingPct = Math.max(0, 100 - actualUsedPct);
  const hoursToReset = Math.max(0, resetInSec) / 3600;

  return {
    averagePct,
    actualUsedPct,
    deltaPct,
    remainingPct,
    resetAt: bounds.end,
    hoursToReset,
  };
}

/** Project when the window empties at the current pace (any window length). */
export function forecastFor(
  pace: PaceView,
  totalMs: number = WEEKLY_WINDOW_MS,
): Forecast {
  if (pace.actualUsedPct <= 0 || pace.averagePct <= 0) {
    return { kind: "unknown", projectedEmptyAt: null, hoursEarly: null };
  }
  const start = pace.resetAt - totalMs;
  const elapsedMs = pace.averagePct / 100 * totalMs;
  const projectedEmptyAt =
    start + elapsedMs * (100 / pace.actualUsedPct);
  if (projectedEmptyAt < pace.resetAt) {
    const hoursEarly = (pace.resetAt - projectedEmptyAt) / 3600000;
    return { kind: "empties_early", projectedEmptyAt, hoursEarly };
  }
  return { kind: "lasts_through_reset", projectedEmptyAt, hoursEarly: null };
}

/** Weekly-only convenience wrapper kept for compatibility. */
export function forecastWeekly(pace: PaceView, w?: UsageWindow): Forecast {
  return forecastFor(pace, w ? windowLengthMs("weekly", w) : WEEKLY_WINDOW_MS);
}

export type PaceColor = "green" | "yellow" | "red";

/**
 * Badge color from weekly pace.
 * - Green: delta <= 0
 * - Yellow: 0 < delta <= 10
 * - Red: delta > 10
 * Escalates one step if the forecast empties before reset.
 */
export function badgeColor(deltaPct: number, forecast: Forecast): PaceColor {
  let color: PaceColor;
  if (deltaPct <= 0) color = "green";
  else if (deltaPct <= 10) color = "yellow";
  else color = "red";

  if (forecast.kind === "empties_early") {
    if (color === "green") color = "yellow";
    else if (color === "yellow") color = "red";
  }
  return color;
}
