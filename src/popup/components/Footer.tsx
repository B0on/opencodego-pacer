interface Props {
  lastSyncedAt: number | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export function Footer({ lastSyncedAt, onRefresh, refreshing }: Props) {
  return (
    <div className="footer">
      <span className="footer__sync">
        {lastSyncedAt
          ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Not synced"}
      </span>
      <button type="button" className="footer__refresh" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? "…" : "Refresh"}
      </button>
    </div>
  );
}
