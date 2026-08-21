import { formatPaceDelta } from "../lib/format.js";

interface Props {
  deltaPct: number;
}

export function PaceLabel({ deltaPct }: Props) {
  const ahead = deltaPct > 0;
  return (
    <div className={`pace-label ${ahead ? "pace-label--ahead" : "pace-label--behind"}`}>
      {formatPaceDelta(deltaPct)}
    </div>
  );
}
