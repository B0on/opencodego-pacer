/** Format a percentage (0-100) with at most one decimal, trimming trailing zeros. */
export function formatPct(pct: number): string {
  const v = Math.round(pct * 10) / 10;
  return `${v}%`;
}

/** Format a duration in hours into a human "Xh YYm" or "Xd Yh" string. */
export function formatDuration(hours: number): string {
  if (hours < 0) return "now";
  const totalMin = Math.round(hours * 60);
  if (totalMin < 60) return `${totalMin}m`;
  if (totalMin < 48 * 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const totalHours = Math.round(hours);
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/** Format an epoch ms as a local "Mon D, HH:mm" string. */
export function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPaceDelta(deltaPct: number): string {
  if (deltaPct > 0) return `Ahead +${deltaPct.toFixed(1)}pt`;
  return `Behind ${deltaPct.toFixed(1)}pt`;
}
