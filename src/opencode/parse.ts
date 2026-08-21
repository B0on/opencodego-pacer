import type { PlanUsage, UsageWindow, WindowStatus } from "../domain/types.js";

export class ParseError extends Error {}

interface RawWindow {
  status: string;
  resetInSec: number;
  usagePercent: number;
}

function normalizeStatus(s: string | undefined): WindowStatus {
  if (s === "ok" || s === "rate-limited") return s;
  return "unavailable";
}

function normalizeWindow(w: RawWindow | undefined): UsageWindow {
  if (!w || typeof w.usagePercent !== "number") {
    return { status: "unavailable", resetInSec: 0, usagePercent: 0 };
  }
  return {
    status: normalizeStatus(w.status),
    resetInSec: Number.isFinite(w.resetInSec) ? w.resetInSec : 0,
    usagePercent: Math.min(100, Math.max(0, w.usagePercent)),
  };
}

/**
 * Parse the SSR page HTML into a PlanUsage.
 *
 * The page embeds a serialized payload of roughly:
 *   {mine:true, ... rollingUsage:{status:"ok",resetInSec:18000,usagePercent:0},
 *    weeklyUsage:{...}, monthlyUsage:{...}}
 *
 * We locate the three window objects by regex on their keys, then extract the
 * contained object literal. This is tolerant to the surrounding Solid Start
 * hydration wrapper (`$R[...]`, `new Date(...)`, etc.).
 */
export function parsePlanHtml(html: string): PlanUsage {
  const weekly = extractWindow(html, "weeklyUsage");
  const rolling = extractWindow(html, "rollingUsage");
  const monthly = extractWindow(html, "monthlyUsage");

  const weeklyW = normalizeWindow(weekly);
  const rollingW = normalizeWindow(rolling);
  const monthlyW = normalizeWindow(monthly);

  if (weeklyW.status === "unavailable" &&
      rollingW.status === "unavailable" &&
      monthlyW.status === "unavailable") {
    throw new ParseError("No OpenCode Go usage window found in page");
  }

  return {
    rolling: rollingW,
    weekly: weeklyW,
    monthly: monthlyW,
  };
}

function extractWindow(html: string, key: string): RawWindow | undefined {
  // Match `keyName:...` followed by an object literal. The SSR wrapper may
  // insert a Solid Start reference (`$R[NN]=`) between the key and the brace.
  // The object has no nested braces, so `{[^}]*}` captures it safely.
  const re = new RegExp(`${key}:\\$R\\[\\d+\\]=\\{([^}]*)\\}|${key}:\\{([^}]*)\\}`);
  const m = html.match(re);
  if (!m) return undefined;

  const body = m[1] ?? m[2];
  const status = matchStr(body, "status");
  const resetInSec = matchNum(body, "resetInSec");
  const usagePercent = matchNum(body, "usagePercent");
  return { status: status ?? "", resetInSec: resetInSec ?? 0, usagePercent: usagePercent ?? 0 };
}

function matchStr(body: string, key: string): string | undefined {
  const re = new RegExp(`${key}:"([^"]*)"`);
  const m = body.match(re);
  return m ? m[1] : undefined;
}

function matchNum(body: string, key: string): number | undefined {
  const re = new RegExp(`${key}:(\\d+)`);
  const m = body.match(re);
  return m ? Number(m[1]) : undefined;
}
