import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseGoStatus, ParseError } from "./parse";

const fixture: unknown = JSON.parse(
  readFileSync(join(process.cwd(), "src/opencode/fixtures/go-status.json"), "utf8"),
);

const NOW = Date.parse("2026-10-24T00:00:00.000Z");

function meter(
  used: string | number,
  limit: string | number,
  resetsAt = "2026-10-24T05:00:00.000Z",
): Record<string, unknown> {
  return { usedMicroCents: used, limitMicroCents: limit, resetsAt };
}

function status(meters: Record<string, unknown>): unknown {
  return {
    product: "go",
    access: {
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-11-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      meters,
    },
  };
}

function healthyMeters(): Record<string, unknown> {
  return {
    fiveHour: meter("120000000", "600000000"),
    week: meter("900000000", "1500000000", "2026-10-27T00:00:00.000Z"),
    month: meter("1200000000", "3000000000", "2026-11-01T00:00:00.000Z"),
  };
}

describe("parseGoStatus", () => {
  it("maps fiveHour/week/month onto rolling/weekly/monthly from the status fixture", () => {
    expect(parseGoStatus(fixture, NOW)).toEqual({
      rolling: { status: "ok", resetInSec: 18000, usagePercent: 20 },
      weekly: { status: "ok", resetInSec: 259200, usagePercent: 60 },
      monthly: { status: "ok", resetInSec: 691200, usagePercent: 40 },
    });
  });

  it("accepts a null fiveHour.startsAt", () => {
    const raw = JSON.parse(JSON.stringify(fixture)) as {
      access: { meters: { fiveHour: { startsAt: string | null } } };
    };
    raw.access.meters.fiveHour.startsAt = null;
    expect(parseGoStatus(raw, NOW).rolling).toEqual({
      status: "ok",
      resetInSec: 18000,
      usagePercent: 20,
    });
  });

  it("rounds usage percent to the nearest integer", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("1", "3"),
        week: meter("2", "3"),
        month: meter("66666667", "100000000"),
      }),
      NOW,
    );
    expect(usage.rolling.usagePercent).toBe(33);
    expect(usage.weekly.usagePercent).toBe(67);
    expect(usage.monthly.usagePercent).toBe(67);
  });

  it("keeps precision for microcent values beyond Number.MAX_SAFE_INTEGER", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("300000000000000000000", "600000000000000000000"),
      }),
      NOW,
    );
    expect(usage.rolling.usagePercent).toBe(50);
  });

  it("accepts numeric microcents", () => {
    const usage = parseGoStatus(
      status({ fiveHour: meter(120000000, 600000000) }),
      NOW,
    );
    expect(usage.rolling.usagePercent).toBe(20);
    expect(usage.rolling.status).toBe("ok");
  });

  it("clamps usage percent to 100 and reports rate-limited when used exceeds the limit", () => {
    const usage = parseGoStatus(status({ fiveHour: meter("900000000", "600000000") }), NOW);
    expect(usage.rolling.usagePercent).toBe(100);
    expect(usage.rolling.status).toBe("rate-limited");
  });

  it("reports rate-limited when used equals the limit", () => {
    const usage = parseGoStatus(status({ fiveHour: meter("600000000", "600000000") }), NOW);
    expect(usage.rolling.usagePercent).toBe(100);
    expect(usage.rolling.status).toBe("rate-limited");
  });

  it("clamps usage percent to 0 when used is negative", () => {
    const usage = parseGoStatus(status({ fiveHour: meter("-50000000", "600000000") }), NOW);
    expect(usage.rolling.usagePercent).toBe(0);
    expect(usage.rolling.status).toBe("ok");
  });

  it("reports 0 percent and ok when the limit is zero or negative", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("1000", "0"),
        week: meter("1000", "-1"),
      }),
      NOW,
    );
    expect(usage.rolling.usagePercent).toBe(0);
    expect(usage.rolling.status).toBe("ok");
    expect(usage.weekly.usagePercent).toBe(0);
    expect(usage.weekly.status).toBe("ok");
  });

  it("floors resetInSec at 0 once the reset time has passed", () => {
    const usage = parseGoStatus(
      status({ fiveHour: meter("1", "10", "2026-10-23T00:00:00.000Z") }),
      NOW,
    );
    expect(usage.rolling.resetInSec).toBe(0);
  });

  it("rounds resetInSec to whole seconds", () => {
    const usage = parseGoStatus(
      status({ fiveHour: meter("1", "10", "2026-10-24T00:00:00.700Z") }),
      NOW,
    );
    expect(usage.rolling.resetInSec).toBe(1);
  });

  it("marks a missing meter unavailable without dropping the other windows", () => {
    const meters = healthyMeters();
    delete meters.month;
    const usage = parseGoStatus(status(meters), NOW);
    expect(usage.monthly).toEqual({ status: "unavailable", resetInSec: 0, usagePercent: 0 });
    expect(usage.rolling.usagePercent).toBe(20);
    expect(usage.weekly.usagePercent).toBe(60);
  });

  it("marks a null meter unavailable", () => {
    const usage = parseGoStatus(status({ ...healthyMeters(), fiveHour: null }), NOW);
    expect(usage.rolling).toEqual({ status: "unavailable", resetInSec: 0, usagePercent: 0 });
    expect(usage.weekly.usagePercent).toBe(60);
  });

  it("marks a meter with no usedMicroCents unavailable", () => {
    const usage = parseGoStatus(
      status({ ...healthyMeters(), week: { limitMicroCents: "1000", resetsAt: "2026-10-27T00:00:00.000Z" } }),
      NOW,
    );
    expect(usage.weekly).toEqual({ status: "unavailable", resetInSec: 0, usagePercent: 0 });
  });

  it("throws ParseError when the body is null", () => {
    expect(() => parseGoStatus(null, NOW)).toThrow(ParseError);
    expect(() => parseGoStatus(null, NOW)).toThrow(/no active/i);
  });

  it("throws ParseError when access is null", () => {
    const raw = { product: "go", access: null };
    expect(() => parseGoStatus(raw, NOW)).toThrow(ParseError);
    expect(() => parseGoStatus(raw, NOW)).toThrow(/no active/i);
  });

  it("throws ParseError when access is missing", () => {
    expect(() => parseGoStatus({ product: "go" }, NOW)).toThrow(ParseError);
    expect(() => parseGoStatus({ product: "go" }, NOW)).toThrow(/no active/i);
  });

  it("throws ParseError when all three meters are missing or malformed", () => {
    expect(() => parseGoStatus(status({}), NOW)).toThrow(/no active/i);
    expect(() =>
      parseGoStatus(status({ fiveHour: null, week: null, month: null }), NOW),
    ).toThrow(/no active/i);
  });
});
