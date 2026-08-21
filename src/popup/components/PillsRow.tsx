import { formatPct } from "../lib/format.js";

interface Props {
  elapsedPct: number;
  usedPct: number;
}

export function PillsRow({ elapsedPct, usedPct }: Props) {
  return (
    <div className="pills">
      <div className="pill">
        <span className="pill-label">Elapsed</span>
        <span className="pill-value">{formatPct(elapsedPct)}</span>
      </div>
      <div className="pill pill--used">
        <span className="pill-label">Used</span>
        <span className="pill-value">{formatPct(usedPct)}</span>
      </div>
    </div>
  );
}
