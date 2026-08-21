import type { UsageWindow } from "../../domain/types.js";
import { cycleBounds, elapsedFraction } from "../../domain/reset.js";
import { formatDuration, formatPct } from "../lib/format.js";

interface Props {
  title: string;
  window: UsageWindow;
  totalMs: number;
  active?: boolean;
  onClick?: () => void;
}

export function MiniCard({ title, window: w, totalMs, active = false, onClick }: Props) {
  const now = Date.now();
  const bounds = cycleBounds(w.resetInSec, now, totalMs);
  const elapsedPct = elapsedFraction(bounds.start, bounds.end, now) * 100;
  const usedPct = w.usagePercent;
  const attention = usedPct > elapsedPct && w.status !== "unavailable";

  return (
    <button
      type="button"
      className={`mini-card ${active ? "mini-card--active" : ""} ${attention ? "mini-card--alert" : ""}`}
      onClick={onClick}
    >
      <div className="mini-card__head">
        <span className="mini-card__title">{title}</span>
        <span className="mini-card__time">{formatDuration(w.resetInSec / 3600)}</span>
      </div>
      <div className="mini-card__bar">
        <div className="mini-card__pace" style={{ width: `${elapsedPct}%` }} />
        <div className="mini-card__fill" style={{ width: `${usedPct}%` }} />
      </div>
      <div className="mini-card__foot">
        <span>{formatPct(usedPct)} used</span>
        {w.status === "rate-limited" && <span className="mini-card__flag">rate-limited</span>}
      </div>
    </button>
  );
}
