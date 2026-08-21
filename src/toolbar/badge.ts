import type { BadgeMode, PaceView } from "../domain/types.js";
import type { PaceColor } from "../domain/pacing.js";

export const MAX_BADGE_TEXT_LENGTH = 4;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Format a number for the Chrome badge: one decimal when the string fits in 4
 * characters (including `.0`), otherwise round to an integer. Matches Ollama
 * Pacer's formatting so `95.6`/`4.4` keep a decimal but long numbers don't
 * overflow the badge.
 */
export function formatBadgeNumber(
  value: number,
  options: { signed?: boolean } = {},
): string {
  const signed = options.signed === true;
  const rounded = round1(value);
  let text = rounded.toFixed(1);
  if (signed && rounded > 0) text = `+${text}`;
  if (text.length <= MAX_BADGE_TEXT_LENGTH) return text;

  const asInteger = Math.round(value);
  const intText = String(asInteger);
  return signed && asInteger > 0 ? `+${intText}` : intText;
}

/** Chrome badge text formatting for the three modes. */
export function badgeText(mode: BadgeMode, pace: PaceView): string {
  switch (mode) {
    case "remaining":
      return formatBadgeNumber(pace.remainingPct);
    case "delta":
      return formatBadgeNumber(pace.deltaPct, { signed: true });
    case "used":
      return formatBadgeNumber(pace.actualUsedPct);
  }
}

export function badgeColorHex(color: PaceColor): string {
  switch (color) {
    case "green":
      return "#22c55e";
    case "yellow":
      return "#eab308";
    case "red":
      return "#ef4444";
  }
}
