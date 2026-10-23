/**
 * Derive cycle bounds for a rolling window from seconds-remaining and now.
 *
 * The status payload exposes absolute reset instants, which `parseGoStatus`
 * converts to `resetInSec`; the cycle start still comes from a nominal length.
 */

export const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 604800000
export const ROLLING_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours
export const MONTHLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // calendar month (30d)

export interface CycleBounds {
  start: number;
  end: number;
  totalMs: number;
}

/**
 * Convert seconds-remaining + now into an absolute cycle.
 * `end = now + resetInSec * 1000`; `start = end - totalMs`.
 */
export function cycleBounds(
  resetInSec: number,
  nowMs: number,
  totalMs: number,
): CycleBounds {
  const end = nowMs + Math.max(0, resetInSec) * 1000;
  return { start: end - totalMs, end, totalMs };
}

/** Fraction of the window elapsed (0–1), clamped to [0, 1]. */
export function elapsedFraction(
  startMs: number,
  endMs: number,
  nowMs: number,
): number {
  const total = endMs - startMs;
  if (total <= 0) return 0;
  const elapsed = (nowMs - startMs) / total;
  return Math.min(1, Math.max(0, elapsed));
}
