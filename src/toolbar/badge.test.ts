import { describe, it, expect } from "vitest";
import { badgeText, badgeColorHex, formatBadgeNumber } from "./badge";

const pace = {
  averagePct: 58,
  actualUsedPct: 4.4,
  deltaPct: -53,
  remainingPct: 95.6,
  resetAt: 0,
  hoursToReset: 100,
};

describe("badgeText", () => {
  it("keeps one decimal when it fits (matches brief: remaining 95.6)", () => {
    expect(badgeText("remaining", pace)).toBe("95.6");
  });
  it("keeps one decimal for small used values (4.4)", () => {
    expect(badgeText("used", pace)).toBe("4.4");
  });
  it("rounds delta to integer when one decimal overflows", () => {
    expect(badgeText("delta", { ...pace, deltaPct: -53 })).toBe("-53");
  });
  it("prefixes positive delta with +", () => {
    expect(badgeText("delta", { ...pace, deltaPct: 5 })).toBe("+5.0");
  });
  it("falls back to integer when one decimal is too wide", () => {
    // 123.4 -> "123.4" is 5 chars, overflows; falls back to integer
    expect(formatBadgeNumber(123.4)).toBe("123");
  });
});

describe("badgeColorHex", () => {
  it("maps pace colors to hex", () => {
    expect(badgeColorHex("green")).toBe("#22c55e");
    expect(badgeColorHex("yellow")).toBe("#eab308");
    expect(badgeColorHex("red")).toBe("#ef4444");
  });
});
