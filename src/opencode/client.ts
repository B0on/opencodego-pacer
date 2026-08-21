import { parsePlanHtml, ParseError } from "./parse.js";
import type { PlanUsage } from "../domain/types.js";

export const OPCODE_HOST = "https://opencode.ai";

export interface FetchResult {
  ok: boolean;
  usage: PlanUsage | null;
  signedIn: boolean;
  error: string | null;
}

/**
 * Fetch the Go plan page for the given workspace and parse its usage.
 *
 * Signed-in status is determined by the fetch itself: a signed-in request
 * returns a page that parses into a PlanUsage; a signed-out request redirects
 * to a login page whose HTML contains no usage windows, which surfaces as a
 * parse failure. This avoids depending on any specific cookie name.
 *
 * Resolves ok=false (not throws) on failure so the caller can keep the previous
 * cache. `credentials:"include"` attaches the session cookie.
 */
export async function fetchPlanUsage(workspaceId: string): Promise<FetchResult> {
  if (!workspaceId) {
    return { ok: false, usage: null, signedIn: false, error: "missing workspace id" };
  }

  const url = `${OPCODE_HOST}/workspace/${workspaceId}/go`;
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch (e) {
    return {
      ok: false,
      usage: null,
      signedIn: false,
      error: `fetch failed: ${(e as Error).message}`,
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      usage: null,
      signedIn: false,
      error: `HTTP ${res.status}`,
    };
  }

  const html = await res.text();
  try {
    const usage = parsePlanHtml(html);
    return { ok: true, usage, signedIn: true, error: null };
  } catch (e) {
    // Could be signed out (login page) or an upstream HTML change.
    return {
      ok: false,
      usage: null,
      signedIn: false,
      error: e instanceof ParseError ? "not signed in or usage unavailable" : "parse failed",
    };
  }
}
