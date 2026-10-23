import type { PlanUsage, UsageWindow } from "../domain/types.js";

export class ParseError extends Error {}

type JsonObject = Record<string, unknown>;

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

function unavailable(): UsageWindow {
  return { status: "unavailable", resetInSec: 0, usagePercent: 0 };
}

function toWindow(value: unknown, now: number): UsageWindow {
  const meter = asObject(value);
  if (!meter) return unavailable();

  const used = toBigInt(meter.usedMicroCents);
  const limit = toBigInt(meter.limitMicroCents);
  const resetsAt = typeof meter.resetsAt === "string" ? Date.parse(meter.resetsAt) : Number.NaN;
  if (used === null || limit === null || Number.isNaN(resetsAt)) return unavailable();

  let usagePercent = 0;
  if (limit > 0n) {
    const rounded = (used * 100n + limit / 2n) / limit;
    usagePercent = Math.min(100, Math.max(0, Number(rounded)));
  }

  return {
    status: limit > 0n && used >= limit ? "rate-limited" : "ok",
    resetInSec: Math.max(0, Math.round((resetsAt - now) / 1000)),
    usagePercent,
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
  const rolling = toWindow(meters?.fiveHour, now);
  const weekly = toWindow(meters?.week, now);
  const monthly = toWindow(meters?.month, now);

  if (
    rolling.status === "unavailable" &&
    weekly.status === "unavailable" &&
    monthly.status === "unavailable"
  ) {
    throw new ParseError("No active OpenCode Go subscription");
  }

  return { rolling, weekly, monthly };
}
