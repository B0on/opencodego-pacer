import type { BadgeMode, RefreshInterval } from "../../domain/types.js";
import { SegmentedControl } from "./SegmentedControl.js";

interface Props {
  badgeMode: BadgeMode;
  refreshInterval: RefreshInterval;
  onBadgeModeChange: (m: BadgeMode) => void;
  onRefreshIntervalChange: (i: RefreshInterval) => void;
}

const badgeOptions: { value: BadgeMode; label: string }[] = [
  { value: "remaining", label: "Remaining" },
  { value: "delta", label: "Delta" },
  { value: "used", label: "Used" },
];

const intervalOptions: { value: RefreshInterval; label: string }[] = [
  { value: "5min", label: "5 min" },
  { value: "15min", label: "15 min" },
  { value: "manual", label: "Manual" },
];

export function Settings({
  badgeMode,
  refreshInterval,
  onBadgeModeChange,
  onRefreshIntervalChange,
}: Props) {
  return (
    <div className="settings">
      <div className="settings__row">
        <span className="settings__label">Badge</span>
        <SegmentedControl
          options={badgeOptions}
          value={badgeMode}
          onChange={onBadgeModeChange}
        />
      </div>
      <div className="settings__row">
        <span className="settings__label">Sync</span>
        <SegmentedControl
          options={intervalOptions}
          value={refreshInterval}
          onChange={onRefreshIntervalChange}
        />
      </div>
    </div>
  );
}
