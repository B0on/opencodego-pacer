import { describe, it, expect, beforeEach, vi } from "vitest";
import type { UsageSnapshot } from "../domain/types.js";
import {
  getSnapshot,
  setSnapshot,
  getSettings,
  getBadgeMode,
  setBadgeMode,
  getRefreshInterval,
  setRefreshInterval,
  getWorkspaceId,
  setWorkspaceId,
  getLastError,
  setLastError,
} from "./cache";

const store = new Map<string, unknown>();
const chromeMock = {
  storage: {
    local: {
      async get(key: string) {
        const out: Record<string, unknown> = {};
        if (store.has(key)) out[key] = store.get(key);
        return out;
      },
      async set(items: Record<string, unknown>) {
        for (const [k, v] of Object.entries(items)) store.set(k, v);
      },
    },
  },
};
vi.stubGlobal("chrome", chromeMock);

const snapshot: UsageSnapshot = {
  plan: {
    rolling: { status: "ok", resetInSec: 18000, usagePercent: 0 },
    weekly: { status: "ok", resetInSec: 204419, usagePercent: 100 },
    monthly: { status: "ok", resetInSec: 494510, usagePercent: 92 },
  },
  fetchedAt: 1000,
};

beforeEach(() => store.clear());

describe("cache", () => {
  it("round-trips a snapshot", async () => {
    await setSnapshot(snapshot);
    expect(await getSnapshot()).toEqual(snapshot);
  });

  it("returns null for missing snapshot", async () => {
    expect(await getSnapshot()).toBeNull();
  });

  it("applies defaults to settings", async () => {
    const s = await getSettings();
    expect(s.badgeMode).toBe("remaining");
    expect(s.refreshInterval).toBe("15min");
    expect(s.workspaceId).toBeNull();
  });

  it("persists badge mode", async () => {
    await setBadgeMode("delta");
    expect(await getBadgeMode()).toBe("delta");
  });

  it("persists refresh interval", async () => {
    await setRefreshInterval("5min");
    expect(await getRefreshInterval()).toBe("5min");
  });

  it("persists workspace id", async () => {
    await setWorkspaceId("wrk_abc");
    expect(await getWorkspaceId()).toBe("wrk_abc");
    await setWorkspaceId(null);
    expect(await getWorkspaceId()).toBeNull();
  });

  it("round-trips last error", async () => {
    await setLastError("HTTP 500");
    expect(await getLastError()).toBe("HTTP 500");
  });
});
