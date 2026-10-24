import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseGoStatus, ParseError } from "./parse";
import { computePacing, windowLengthMs } from "../domain/pacing";

const fixture: unknown = JSON.parse(
  readFileSync(join(process.cwd(), "src/opencode/fixtures/go-status.json"), "utf8"),
);

const NOW = Date.parse("2026-10-24T00:00:00.000Z");

function meter(
  used: string | number,
  limit: string | number,
  resetsAt = "2026-10-24T05:00:00.000Z",
  startsAt?: string | null,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    usedMicroCents: used,
    limitMicroCents: limit,
    resetsAt,
  };
  if (startsAt !== undefined) result.startsAt = startsAt;
  return result;
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

function monthStatus(
  accessStartsAt: string,
  accessEndsAt: string,
  monthResetsAt: string,
): unknown {
  return {
    product: "go",
    access: {
      startsAt: accessStartsAt,
      endsAt: accessEndsAt,
      cancelAtPeriodEnd: false,
      meters: {
        month: {
          usedMicroCents: "1000000",
          limitMicroCents: "10000000",
          resetsAt: monthResetsAt,
        },
      },
    },
  };
}

describe("parseGoStatus", () => {
  it("maps fiveHour/week/month onto rolling/weekly/monthly from the status fixture", () => {
    expect(parseGoStatus(fixture, NOW)).toEqual({
      rolling: { status: "ok", resetInSec: 18000, usagePercent: 20, windowMs: 18000000 },
      weekly: { status: "ok", resetInSec: 259200, usagePercent: 60, windowMs: 604800000 },
      monthly: { status: "ok", resetInSec: 691200, usagePercent: 40, windowMs: 2678400000 },
    });
  });

  it("derives the monthly window from the access period when it ends at the month reset", () => {
    const usage = parseGoStatus(
      monthStatus(
        "2027-01-31T00:00:00.000Z",
        "2027-02-28T00:00:00.000Z",
        "2027-02-28T00:00:00.000Z",
      ),
      NOW,
    );
    expect(usage.monthly.windowMs).toBe(28 * 24 * 60 * 60 * 1000);
  });

  it("falls back to a calendar month when the access period does not end at the month reset", () => {
    const usage = parseGoStatus(
      monthStatus(
        "2027-01-31T00:00:00.000Z",
        "2027-02-28T00:00:00.000Z",
        "2027-04-01T00:00:00.000Z",
      ),
      NOW,
    );
    expect(usage.monthly.windowMs).toBe(31 * 24 * 60 * 60 * 1000);
  });

  it("falls back to a calendar month when the access period is longer than 32 days", () => {
    const usage = parseGoStatus(
      monthStatus(
        "2025-03-01T00:00:00.000Z",
        "2026-03-01T00:00:00.000Z",
        "2026-03-01T00:00:00.000Z",
      ),
      NOW,
    );
    expect(usage.monthly.windowMs).toBe(28 * 24 * 60 * 60 * 1000);
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
      windowMs: 18000000,
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
    expect(usage.monthly).toEqual({
      status: "unavailable",
      resetInSec: 0,
      usagePercent: 0,
      windowMs: 2592000000,
    });
    expect(usage.rolling.usagePercent).toBe(20);
    expect(usage.weekly.usagePercent).toBe(60);
  });

  it("marks a null meter unavailable", () => {
    const usage = parseGoStatus(status({ ...healthyMeters(), fiveHour: null }), NOW);
    expect(usage.rolling).toEqual({
      status: "unavailable",
      resetInSec: 0,
      usagePercent: 0,
      windowMs: 18000000,
    });
    expect(usage.weekly.usagePercent).toBe(60);
  });

  it("marks a meter with no usedMicroCents unavailable", () => {
    const usage = parseGoStatus(
      status({ ...healthyMeters(), week: { limitMicroCents: "1000", resetsAt: "2026-10-27T00:00:00.000Z" } }),
      NOW,
    );
    expect(usage.weekly).toEqual({
      status: "unavailable",
      resetInSec: 0,
      usagePercent: 0,
      windowMs: 604800000,
    });
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

describe("windowMs", () => {
  it("regression: a 31-day month with 30d17h remaining has nonzero elapsed pace", () => {
    // 2026-11-01 is 31 days after the 2026-10-01 calendar-month start.
    const resetsAt = "2026-11-01T00:00:00.000Z";
    const remainingMs = (30 * 24 + 17) * 60 * 60 * 1000;
    const now = Date.parse(resetsAt) - remainingMs;
    const usage = parseGoStatus(
      status({ month: meter("0", "3000000000", resetsAt) }),
      now,
    );

    expect(usage.monthly.windowMs).toBe(31 * DAY_MS);

    const totalMs = windowLengthMs("monthly", usage.monthly);
    const pace = computePacing(
      usage.monthly.usagePercent,
      usage.monthly.resetInSec,
      now,
      totalMs,
    );

    // 7h of 31d elapsed (31d - 30d17h), not the zero a 30-day nominal
    // window produces by placing the cycle start after `now`.
    expect(pace.averagePct).toBeCloseTo((7 / (31 * 24)) * 100, 6);
    expect(pace.averagePct).toBeGreaterThan(0);
  });

  it("derives calendar-month lengths and clamps day overflow in UTC", () => {
    const cases: [string, number][] = [
      // Mar 31 -> Feb 28 (2026 is not a leap year).
      ["2026-03-31T00:00:00.000Z", 31 * DAY_MS],
      // Nov 24 -> Oct 24, a 31-day month.
      ["2026-11-24T00:00:00.000Z", 31 * DAY_MS],
      // Dec 31 -> Nov 30 clamp, also a 31-day span.
      ["2026-12-31T00:00:00.000Z", 31 * DAY_MS],
      // Feb 1 -> Jan 1, a 31-day span.
      ["2026-02-01T00:00:00.000Z", 31 * DAY_MS],
      // Mar 1 -> Feb 1, a 28-day span.
      ["2026-03-01T00:00:00.000Z", 28 * DAY_MS],
      // Leap year: Mar 31 -> Feb 29, 2028.
      ["2028-03-31T00:00:00.000Z", 31 * DAY_MS],
    ];

    for (const [resetsAt, expected] of cases) {
      const usage = parseGoStatus(
        status({ month: meter("0", "3000000000", resetsAt) }),
        Date.parse("2026-01-01T00:00:00.000Z"),
      );
      expect(usage.monthly.windowMs, resetsAt).toBe(expected);
    }
  });

  it("uses startsAt for fiveHour and week when present", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("0", "1000", "2026-10-24T05:00:00.000Z", "2026-10-24T01:00:00.000Z"),
        week: meter("0", "1000", "2026-10-27T00:00:00.000Z", "2026-10-21T00:00:00.000Z"),
      }),
      NOW,
    );

    expect(usage.rolling.windowMs).toBe(4 * 60 * 60 * 1000);
    expect(usage.weekly.windowMs).toBe(6 * DAY_MS);
  });

  it("prefers a valid monthly startsAt over the calendar-month derivation", () => {
    const usage = parseGoStatus(
      status({
        month: meter("0", "1000", "2026-11-01T00:00:00.000Z", "2026-10-15T00:00:00.000Z"),
      }),
      NOW,
    );

    expect(usage.monthly.windowMs).toBe(17 * DAY_MS);
  });

  it("falls back to the nominal length when startsAt is null or invalid", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("0", "1000", "2026-10-24T05:00:00.000Z", null),
        week: meter("0", "1000", "2026-10-27T00:00:00.000Z", "not-a-date"),
      }),
      NOW,
    );

    expect(usage.rolling.windowMs).toBe(5 * 60 * 60 * 1000);
    expect(usage.weekly.windowMs).toBe(7 * DAY_MS);
  });

  it("keeps the nominal length when startsAt is not before resetsAt", () => {
    const usage = parseGoStatus(
      status({
        fiveHour: meter("0", "1000", "2026-10-24T05:00:00.000Z", "2026-10-24T06:00:00.000Z"),
      }),
      NOW,
    );

    expect(usage.rolling.windowMs).toBe(5 * 60 * 60 * 1000);
  });

  it("gives unavailable windows the nominal length", () => {
    const usage = parseGoStatus(
      status({ ...healthyMeters(), fiveHour: null }),
      NOW,
    );

    expect(usage.rolling).toEqual({
      status: "unavailable",
      resetInSec: 0,
      usagePercent: 0,
      windowMs: 5 * 60 * 60 * 1000,
    });
  });
});
