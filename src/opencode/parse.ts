import type { PlanUsage, UsageWindow } from "../domain/types.js";
import {
  MONTHLY_WINDOW_MS,
  ROLLING_WINDOW_MS,
  WEEKLY_WINDOW_MS,
} from "../domain/reset.js";

export class ParseError extends Error {}

type JsonObject = Record<string, unknown>;

type MeterKey = "rolling" | "weekly" | "monthly";

const NOMINAL_WINDOW_MS: Record<MeterKey, number> = {
  rolling: ROLLING_WINDOW_MS,
  weekly: WEEKLY_WINDOW_MS,
  monthly: MONTHLY_WINDOW_MS,
};

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as JsonObject;
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return BigInt(value);
  }
  return null;
}

function unavailable(key: MeterKey): UsageWindow {
  return {
    status: "unavailable",
    resetInSec: 0,
    usagePercent: 0,
    windowMs: NOMINAL_WINDOW_MS[key],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calendar month containing `resetsAt` shifted back one UTC month. Months with
 * no matching day (e.g. Mar 31 -> Feb) clamp to the previous month's last day.
 */
function previousMonthStartUtc(resetsAt: number): number {
  const start = new Date(resetsAt);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 1);
  const daysInMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  ).getUTCDate();
  start.setUTCDate(Math.min(day, daysInMonth));
  return start.getTime();
}

/**
 * Start of the subscription period when the monthly meter's reset is the
 * period end. Anchoring on `access.startsAt` avoids mis-deriving short months
 * (e.g. Jan 31 -> Feb 28); returns null when the access period does not match
 * a single ~month.
 */
function accessPeriodStart(resetsAt: number, access: JsonObject | null): number | null {
  if (!access) return null;
  const startsAt =
    typeof access.startsAt === "string" ? Date.parse(access.startsAt) : Number.NaN;
  const endsAt =
    typeof access.endsAt === "string" ? Date.parse(access.endsAt) : Number.NaN;
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || endsAt !== resetsAt) {
    return null;
  }
  const periodMs = endsAt - startsAt;
  return periodMs >= 27 * DAY_MS && periodMs <= 32 * DAY_MS ? startsAt : null;
}

/** Real length of the current window, derived from the payload when possible. */
function windowMsFor(
  meter: JsonObject,
  resetsAt: number,
  key: MeterKey,
  access: JsonObject | null,
): number {
  const startsAt =
    typeof meter.startsAt === "string" ? Date.parse(meter.startsAt) : Number.NaN;
  if (!Number.isNaN(startsAt) && resetsAt - startsAt > 0) {
    return resetsAt - startsAt;
  }
  if (key === "monthly") {
    const periodStart = accessPeriodStart(resetsAt, access);
    if (periodStart !== null) return resetsAt - periodStart;
    return resetsAt - previousMonthStartUtc(resetsAt);
  }
  return NOMINAL_WINDOW_MS[key];
}

function toWindow(
  value: unknown,
  now: number,
  key: MeterKey,
  access: JsonObject | null = null,
): UsageWindow {
  const meter = asObject(value);
  if (!meter) return unavailable(key);

  const used = toBigInt(meter.usedMicroCents);
  const limit = toBigInt(meter.limitMicroCents);
  const resetsAt = typeof meter.resetsAt === "string" ? Date.parse(meter.resetsAt) : Number.NaN;
  if (used === null || limit === null || Number.isNaN(resetsAt)) return unavailable(key);

  let usagePercent = 0;
  if (limit > 0n) {
    const rounded = (used * 100n + limit / 2n) / limit;
    usagePercent = Math.min(100, Math.max(0, Number(rounded)));
  }

  return {
    status: limit > 0n && used >= limit ? "rate-limited" : "ok",
    resetInSec: Math.max(0, Math.round((resetsAt - now) / 1000)),
    usagePercent,
    windowMs: windowMsFor(meter, resetsAt, key, access),
  };
}

/**
 * Convert the console status JSON into a PlanUsage.
 *
 * The status endpoint returns `{access: {meters: {fiveHour, week, month}}}`
 * or `null` when no Go subscription is active. Meters carry microcent totals
 * as decimal strings and reset instants as ISO-8601 timestamps. Anything that
 * does not match that shape degrades to an unavailable window; a payload with
 * no usable window at all throws ParseError.
 */
export function parseGoStatus(json: unknown, now: number): PlanUsage {
  const root = asObject(json);
  const access = root ? asObject(root.access) : null;
  if (!access) throw new ParseError("No active OpenCode Go subscription");

  const meters = asObject(access.meters);
  const rolling = toWindow(meters?.fiveHour, now, "rolling");
  const weekly = toWindow(meters?.week, now, "weekly");
  const monthly = toWindow(meters?.month, now, "monthly", access);

  if (
    rolling.status === "unavailable" &&
    weekly.status === "unavailable" &&
    monthly.status === "unavailable"
  ) {
    throw new ParseError("No active OpenCode Go subscription");
  }

  return { rolling, weekly, monthly };
}
