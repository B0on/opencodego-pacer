import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchPlanUsage, workspaceIdFromUrl } from "./client";

const fixture = readFileSync(
  join(process.cwd(), "src/opencode/fixtures/go-status.json"),
  "utf8",
);

const NOW = Date.parse("2026-10-24T00:00:00.000Z");
const WORKSPACE_ID = "wrk_01K46JDFR0E75SG2Q8K172KF3Y";
const STATUS_URL = "https://opencode.ai/console/api/go/status";

function response(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchPlanUsage", () => {
  it("requests the console status endpoint with the session cookie and org header", async () => {
    fetchMock.mockResolvedValue(response(200, fixture));

    await fetchPlanUsage(WORKSPACE_ID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(STATUS_URL);
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ "x-org-id": WORKSPACE_ID });
  });

  it("returns the converted usage on success", async () => {
    fetchMock.mockResolvedValue(response(200, fixture));

    const result = await fetchPlanUsage(WORKSPACE_ID);

    expect(result).toEqual({
      ok: true,
      signedIn: true,
      error: null,
      usage: {
        rolling: { status: "ok", resetInSec: 18000, usagePercent: 20, windowMs: 18000000 },
        weekly: { status: "ok", resetInSec: 259200, usagePercent: 60, windowMs: 604800000 },
        monthly: { status: "ok", resetInSec: 691200, usagePercent: 40, windowMs: 2678400000 },
      },
    });
  });

  it("reports not signed in on 401", async () => {
    fetchMock.mockResolvedValue(response(401, '{"_tag":"Unauthorized"}'));

    expect(await fetchPlanUsage(WORKSPACE_ID)).toEqual({
      ok: false,
      usage: null,
      signedIn: false,
      error: "not signed in",
    });
  });

  it("reports not signed in on 403", async () => {
    fetchMock.mockResolvedValue(response(403, ""));

    expect(await fetchPlanUsage(WORKSPACE_ID)).toEqual({
      ok: false,
      usage: null,
      signedIn: false,
      error: "not signed in",
    });
  });

  it("reports the status code on 500 while staying signed in", async () => {
    fetchMock.mockResolvedValue(response(500, "boom"));

    expect(await fetchPlanUsage(WORKSPACE_ID)).toEqual({
      ok: false,
      usage: null,
      signedIn: true,
      error: "HTTP 500",
    });
  });

  it("reports invalid response on unparseable JSON", async () => {
    fetchMock.mockResolvedValue(response(200, "<html>not json</html>"));

    expect(await fetchPlanUsage(WORKSPACE_ID)).toEqual({
      ok: false,
      usage: null,
      signedIn: true,
      error: "invalid response",
    });
  });

  it("reports the parse error when access is null", async () => {
    fetchMock.mockResolvedValue(response(200, '{"product":"go","access":null}'));

    const result = await fetchPlanUsage(WORKSPACE_ID);

    expect(result.ok).toBe(false);
    expect(result.usage).toBeNull();
    expect(result.signedIn).toBe(true);
    expect(result.error).toMatch(/no active/i);
  });

  it("reports the parse error when the body is null", async () => {
    fetchMock.mockResolvedValue(response(200, "null"));

    const result = await fetchPlanUsage(WORKSPACE_ID);

    expect(result.ok).toBe(false);
    expect(result.usage).toBeNull();
    expect(result.signedIn).toBe(true);
    expect(result.error).toMatch(/no active/i);
  });

  it("does not call fetch without a workspace id", async () => {
    expect(await fetchPlanUsage("")).toEqual({
      ok: false,
      usage: null,
      signedIn: false,
      error: "missing workspace id",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a fetch failure without throwing", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    expect(await fetchPlanUsage(WORKSPACE_ID)).toEqual({
      ok: false,
      usage: null,
      signedIn: false,
      error: "fetch failed: network down",
    });
  });
});

describe("workspaceIdFromUrl", () => {
  it("reads an org id from the console path", () => {
    expect(workspaceIdFromUrl("https://opencode.ai/console/org_ABC123/go")).toBe("org_ABC123");
  });

  it("reads a workspace id from the console path", () => {
    expect(
      workspaceIdFromUrl(`https://opencode.ai/console/${WORKSPACE_ID}`),
    ).toBe(WORKSPACE_ID);
  });

  it("reads a workspace id from the legacy workspace path", () => {
    expect(workspaceIdFromUrl("https://opencode.ai/workspace/wrk_X/go")).toBe("wrk_X");
  });

  it("returns null for the login page", () => {
    expect(workspaceIdFromUrl("https://opencode.ai/console/login")).toBeNull();
  });

  it("returns null for the bare go page", () => {
    expect(workspaceIdFromUrl("https://opencode.ai/go")).toBeNull();
  });

  it("returns null for a non-opencode.ai host", () => {
    expect(workspaceIdFromUrl("https://example.com/console/org_x")).toBeNull();
  });
});
