import { useEffect, useState, useCallback } from "react";
import type { BadgeMode, RefreshInterval } from "../domain/types.js";
import {
  computePacing,
  forecastFor,
  WINDOW_MS,
  WINDOW_LABEL,
  type WindowKey,
} from "../domain/pacing.js";
import {
  PillsRow,
  PaceLabel,
  WeeklyForecast,
  MiniCard,
  Settings,
  Footer,
  SignInCTA,
  Skeletons,
} from "./components/index.js";
import { loadData, refreshData, type PopupState } from "./lib/loadData.js";
import { sendSetBadgeMode, sendSetInterval, sendSetActiveWindow } from "./lib/messaging.js";
import { formatDuration } from "./lib/format.js";

export function App() {
  const [state, setState] = useState<PopupState>({
    snapshot: null,
    settings: null,
    error: null,
    signedIn: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<WindowKey>("monthly");

  const handleSetActive = useCallback(async (win: WindowKey) => {
    setActive(win);
    await sendSetActiveWindow(win);
  }, []);

  const load = useCallback(async () => {
    const s = await loadData();
    setState(s);
    if (s.settings?.activeWindow) {
      setActive(s.settings.activeWindow);
    }
    setLoading(false);
    return s;
  }, []);

  useEffect(() => {
    // Popup always fetches on open so a signed-in user sees fresh data.
    void (async () => {
      const s = await load();
      if (!s.snapshot) {
        await refreshData();
        await load();
      }
    })();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    await load();
    setRefreshing(false);
  }, [load]);

  const handleBadgeMode = useCallback(async (mode: BadgeMode) => {
    await sendSetBadgeMode(mode);
    await load();
  }, [load]);

  const handleInterval = useCallback(async (interval: RefreshInterval) => {
    await sendSetInterval(interval);
    await load();
  }, [load]);

  if (loading) {
    return <Skeletons />;
  }

  const { snapshot, settings, signedIn } = state;
  const signedOut = !signedIn;

  if (signedOut) {
    return (
      <div className="popup">
        <SignInCTA />
      </div>
    );
  }

  if (!snapshot || !settings) {
    return (
      <div className="popup">
        <div className="error">{state.error ?? "No data yet."}</div>
        <Footer lastSyncedAt={null} onRefresh={handleRefresh} refreshing={refreshing} />
      </div>
    );
  }

  const now = Date.now();
  const win = snapshot.plan[active];
  const totalMs = WINDOW_MS[active];
  const pace = computePacing(win.usagePercent, win.resetInSec, now, totalMs);
  const forecast = forecastFor(pace, totalMs);

  const cards: { key: WindowKey; title: string }[] = [
    { key: "rolling", title: WINDOW_LABEL.rolling },
    { key: "weekly", title: WINDOW_LABEL.weekly },
    { key: "monthly", title: WINDOW_LABEL.monthly },
  ];

  return (
    <div className="popup">
      {state.error && <div className="error">{state.error}</div>}

      <div className="popup__header">
        <span className="popup__plan">OpenCode Go</span>
        <span className="popup__reset">
          {WINDOW_LABEL[active]} resets in {formatDuration(pace.hoursToReset)}
        </span>
      </div>

      <PillsRow elapsedPct={pace.averagePct} usedPct={pace.actualUsedPct} />

      <PaceLabel deltaPct={pace.deltaPct} />
      <WeeklyForecast forecast={forecast} windowLabel={WINDOW_LABEL[active]} />

      <div className="mini-cards">
        {cards.map(({ key, title }) => (
          <MiniCard
            key={key}
            title={title}
            window={snapshot.plan[key]}
            totalMs={WINDOW_MS[key]}
            active={key === active}
            onClick={() => void handleSetActive(key)}
          />
        ))}
      </div>

      {settings && (
        <Settings
          badgeMode={settings.badgeMode}
          refreshInterval={settings.refreshInterval}
          onBadgeModeChange={handleBadgeMode}
          onRefreshIntervalChange={handleInterval}
        />
      )}

      <Footer lastSyncedAt={snapshot.fetchedAt} onRefresh={handleRefresh} refreshing={refreshing} />
    </div>
  );
}
