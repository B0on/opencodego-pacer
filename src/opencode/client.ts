import { parseGoStatus, ParseError } from "./parse.js";
import type { PlanUsage } from "../domain/types.js";

export const OPCODE_HOST = "https://opencode.ai";

const GO_STATUS_URL = `${OPCODE_HOST}/console/api/go/status`;

export interface FetchResult {
  ok: boolean;
  usage: PlanUsage | null;
  signedIn: boolean;
  error: string | null;
}

/**
 * Fetch Go usage for the given workspace (org) ID.
 *
 * The console is a SPA, so usage comes from its JSON status endpoint rather
 * than page HTML. `credentials: "include"` attaches the session cookie and
 * the `x-org-id` header selects the workspace. Signed-in status comes from
 * the response itself: 401/403 means no session.
 *
 * Resolves ok=false (not throws) on failure so the caller can keep the previous
 * cache.
 */
export async function fetchPlanUsage(workspaceId: string): Promise<FetchResult> {
  if (!workspaceId) {
    return { ok: false, usage: null, signedIn: false, error: "missing workspace id" };
  }

  let res: Response;
  try {
    res = await fetch(GO_STATUS_URL, {
      credentials: "include",
      headers: { "x-org-id": workspaceId },
    });
  } catch (e) {
    return {
      ok: false,
      usage: null,
      signedIn: false,
      error: `fetch failed: ${(e as Error).message}`,
    };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, usage: null, signedIn: false, error: "not signed in" };
  }
  if (!res.ok) {
    return {
      ok: false,
      usage: null,
      signedIn: true,
      error: `HTTP ${res.status}`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, usage: null, signedIn: true, error: "invalid response" };
  }

  try {
    const usage = parseGoStatus(json, Date.now());
    return { ok: true, usage, signedIn: true, error: null };
  } catch (e) {
    return {
      ok: false,
      usage: null,
      signedIn: true,
      error: e instanceof ParseError ? e.message : "invalid response",
    };
  }
}

/**
 * Extract the workspace (org) ID from an open OpenCode console tab URL.
 *
 * New console URLs carry `org_...` or `wrk_...` under `/console/`; the legacy
 * `/workspace/{id}/go` path is still accepted for tabs opened before the v2
 * console. Returns null for any other host or path.
 */
export function workspaceIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== "opencode.ai") return null;

  const match =
    parsed.pathname.match(/^\/console\/((?:org|wrk)_[A-Za-z0-9]+)(?:\/|$)/) ??
    parsed.pathname.match(/^\/workspace\/(wrk_[A-Za-z0-9]+)(?:\/|$)/);
  return match ? match[1] : null;
}
