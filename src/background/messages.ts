export interface RefreshResponse {
  ok: boolean;
  signedIn: boolean;
  snapshot?: import("../domain/types.js").UsageSnapshot;
  error?: string | null;
}

export const MESSAGE_REFRESH = "refresh";
export const MESSAGE_SET_INTERVAL = "set-interval";
export const MESSAGE_SET_BADGE_MODE = "set-badge-mode";
export const MESSAGE_SET_ACTIVE_WINDOW = "set-active-window";
export const MESSAGE_GET_STATE = "get-state";

export interface SetActiveWindowMessage {
  type: typeof MESSAGE_SET_ACTIVE_WINDOW;
  window: import("../domain/types.js").ActiveWindow;
}

export interface SetIntervalMessage {
  type: typeof MESSAGE_SET_INTERVAL;
  interval: import("../domain/types.js").RefreshInterval;
}

export interface SetBadgeModeMessage {
  type: typeof MESSAGE_SET_BADGE_MODE;
  mode: import("../domain/types.js").BadgeMode;
}

export interface RefreshMessage {
  type: typeof MESSAGE_REFRESH;
}

export interface GetStateMessage {
  type: typeof MESSAGE_GET_STATE;
}
