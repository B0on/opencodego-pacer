import type { Forecast } from "../../domain/pacing.js";
import { formatDateTime, formatDuration } from "../lib/format.js";

interface Props {
  forecast: Forecast;
  /** Window label, e.g. "Week" / "Month", used in the forecast text. */
  windowLabel: string;
}

export function WeeklyForecast({ forecast, windowLabel }: Props) {
  if (forecast.kind === "unknown") {
    return <div className="forecast">At this pace, outcome is unknown.</div>;
  }
  if (forecast.kind === "empties_early" && forecast.projectedEmptyAt != null) {
    return (
      <div className="forecast forecast--alert">
        At this pace, {windowLabel} empties on {formatDateTime(forecast.projectedEmptyAt)}
        {" "}({formatDuration(forecast.hoursEarly ?? 0)} before reset).
      </div>
    );
  }
  return <div className="forecast">At this pace, {windowLabel} lasts through reset.</div>;
}
