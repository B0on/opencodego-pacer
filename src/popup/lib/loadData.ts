import type {
  UsageSnapshot,
  Settings,
} from "../../domain/types.js";
import { getState, sendRefresh } from "./messaging.js";

export interface PopupState {
  snapshot: UsageSnapshot | null;
  settings: Settings | null;
  error: string | null;
  signedIn: boolean;
}

export async function loadData(): Promise<PopupState> {
  const res = await getState();
  if (!res.ok) {
    return { snapshot: null, settings: null, error: res.error ?? "failed to load", signedIn: false };
  }
  return {
    snapshot: res.snapshot ?? null,
    settings: res.settings ?? null,
    error: res.error ?? null,
    signedIn: res.signedIn ?? false,
  };
}

export async function refreshData(): Promise<{ ok: boolean; signedIn: boolean; error: string | null }> {
  const res = await sendRefresh();
  const r = (res ?? {}) as { ok?: boolean; signedIn?: boolean; error?: string | null };
  return { ok: !!r.ok, signedIn: !!r.signedIn, error: r.error ?? null };
}
