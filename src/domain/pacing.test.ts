import { describe, it, expect } from "vitest";
import {
  computePacing,
  forecastWeekly,
  badgeColor,
  windowLengthMs,
  WINDOW_MS,
  type Forecast,
} from "./pacing";
import type { UsageWindow } from "./types";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 7, 21, 12, 0, 0); // 2026-08-21T12:00:00Z

describe("computePacing", () => {
  it("computes zero elapsed at window start", () => {
    const resetInSec = WEEK / 1000;
    const p = computePacing(0, resetInSec, now);
    expect(p.averagePct).toBeCloseTo(0, 5);
    expect(p.actualUsedPct).toBe(0);
    expect(p.deltaPct).toBeCloseTo(0, 5);
  });

  it("computes ~50% elapsed halfway through the weekly window", () => {
    const resetInSec = WEEK / 2 / 1000;
    const p = computePacing(20, resetInSec, now);
    expect(p.averagePct).toBeCloseTo(50, 5);
    expect(p.deltaPct).toBeCloseTo(-30, 5);
  });

  it("clamps resetAt to now + remaining", () => {
    const p = computePacing(10, 3600, now);
    expect(p.resetAt).toBe(now + 3600 * 1000);
  });

  it("clamps usage to [0,100]", () => {
    const p = computePacing(120, WEEK / 2 / 1000, now);
    expect(p.actualUsedPct).toBe(100);
  });
});

describe("windowLengthMs", () => {
  const base = { status: "ok", resetInSec: 3600, usagePercent: 10 } as const;
  const oldSnapshot = base as unknown as UsageWindow;

  it("returns the parsed window length when it is positive and finite", () => {
    const w: UsageWindow = { ...base, windowMs: 31 * 24 * 60 * 60 * 1000 };
    expect(windowLengthMs("monthly", w)).toBe(31 * 24 * 60 * 60 * 1000);
  });

  it("falls back to the nominal length when windowMs is missing (old snapshot)", () => {
    expect(windowLengthMs("rolling", oldSnapshot)).toBe(WINDOW_MS.rolling);
    expect(windowLengthMs("weekly", oldSnapshot)).toBe(WINDOW_MS.weekly);
    expect(windowLengthMs("monthly", oldSnapshot)).toBe(WINDOW_MS.monthly);
  });

  it("falls back to the nominal length when windowMs is zero", () => {
    expect(windowLengthMs("rolling", { ...base, windowMs: 0 })).toBe(WINDOW_MS.rolling);
    expect(windowLengthMs("weekly", { ...base, windowMs: 0 })).toBe(WINDOW_MS.weekly);
    expect(windowLengthMs("monthly", { ...base, windowMs: 0 })).toBe(WINDOW_MS.monthly);
  });

  it("falls back to the nominal length when windowMs is NaN", () => {
    expect(windowLengthMs("rolling", { ...base, windowMs: Number.NaN })).toBe(WINDOW_MS.rolling);
    expect(windowLengthMs("weekly", { ...base, windowMs: Number.NaN })).toBe(WINDOW_MS.weekly);
    expect(windowLengthMs("monthly", { ...base, windowMs: Number.NaN })).toBe(WINDOW_MS.monthly);
  });
});

describe("forecastWeekly", () => {
  it("returns unknown when nothing used", () => {
    const p = computePacing(0, WEEK / 2 / 1000, now);
    expect(forecastWeekly(p).kind).toBe("unknown");
  });

  it("flags empties_early when pace depletes before reset", () => {
    // 90% used at 50% elapsed -> will empty early
    const p = computePacing(90, WEEK / 2 / 1000, now);
    const f = forecastWeekly(p);
    expect(f.kind).toBe("empties_early");
    expect(f.hoursEarly).toBeGreaterThan(0);
  });

  it("lasts through reset when pace is under budget", () => {
    const p = computePacing(10, WEEK / 2 / 1000, now);
    expect(forecastWeekly(p).kind).toBe("lasts_through_reset");
  });
});

describe("badgeColor", () => {
  it("maps delta thresholds", () => {
    const ok: Forecast = { kind: "lasts_through_reset", projectedEmptyAt: null, hoursEarly: null };
    expect(badgeColor(-5, ok)).toBe("green");
    expect(badgeColor(5, ok)).toBe("yellow");
    expect(badgeColor(15, ok)).toBe("red");
  });

  it("escalates one step when empties early", () => {
    const early: Forecast = { kind: "empties_early", projectedEmptyAt: 0, hoursEarly: 1 };
    expect(badgeColor(-5, early)).toBe("yellow");
    expect(badgeColor(5, early)).toBe("red");
    expect(badgeColor(15, early)).toBe("red");
  });
});
