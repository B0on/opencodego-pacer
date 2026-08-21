import { describe, it, expect } from "vitest";
import { formatDuration, formatPct } from "./format";

describe("formatDuration", () => {
  it("formats sub-minute", () => {
    expect(formatDuration(0.5)).toBe("30m");
    expect(formatDuration(0.1)).toBe("6m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(2)).toBe("2h");
    expect(formatDuration(2.5)).toBe("2h 30m");
  });

  it("rolls 60 minutes up into the next hour (bug fix)", () => {
    expect(formatDuration(1.99)).toBe("1h 59m");
    expect(formatDuration(1.999)).toBe("2h");
  });

  it("formats days and hours", () => {
    expect(formatDuration(48)).toBe("2d");
    expect(formatDuration(50)).toBe("2d 2h");
    expect(formatDuration(55.5)).toBe("2d 8h");
  });

  it("handles negative as now", () => {
    expect(formatDuration(-1)).toBe("now");
  });
});

describe("formatPct", () => {
  it("keeps one decimal", () => {
    expect(formatPct(66.5)).toBe("66.5%");
    expect(formatPct(100)).toBe("100%");
  });
});
