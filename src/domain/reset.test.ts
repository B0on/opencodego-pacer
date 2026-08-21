import { describe, it, expect } from "vitest";
import { cycleBounds, elapsedFraction, WEEKLY_WINDOW_MS } from "./reset";

describe("cycleBounds", () => {
  it("derives end from resetInSec and now", () => {
    const b = cycleBounds(3600, 1000_000, WEEKLY_WINDOW_MS);
    expect(b.end).toBe(1000_000 + 3600 * 1000);
    expect(b.totalMs).toBe(WEEKLY_WINDOW_MS);
    expect(b.start).toBe(b.end - WEEKLY_WINDOW_MS);
  });

  it("clamps negative resetInSec to zero", () => {
    const b = cycleBounds(-5, 1000_000, WEEKLY_WINDOW_MS);
    expect(b.end).toBe(1000_000);
  });
});

describe("elapsedFraction", () => {
  it("returns 0 at start, 1 at end, 0.5 in the middle", () => {
    const end = 2000;
    const start = 0;
    expect(elapsedFraction(start, end, start)).toBe(0);
    expect(elapsedFraction(start, end, end)).toBe(1);
    expect(elapsedFraction(start, end, 1000)).toBeCloseTo(0.5);
  });

  it("clamps outside bounds", () => {
    expect(elapsedFraction(0, 100, -10)).toBe(0);
    expect(elapsedFraction(0, 100, 200)).toBe(1);
  });
});
