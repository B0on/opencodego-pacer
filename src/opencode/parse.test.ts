import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePlanHtml, ParseError } from "./parse";

const fixture = readFileSync(
  join(process.cwd(), "src/opencode/fixtures/plan.html"),
  "utf8",
);

describe("parsePlanHtml", () => {
  it("parses all three windows from the real SSR fixture", () => {
    const usage = parsePlanHtml(fixture);
    expect(usage.weekly.status).toBe("rate-limited");
    expect(usage.weekly.resetInSec).toBe(204419);
    expect(usage.weekly.usagePercent).toBe(100);

    expect(usage.rolling.status).toBe("ok");
    expect(usage.rolling.resetInSec).toBe(18000);
    expect(usage.rolling.usagePercent).toBe(0);

    expect(usage.monthly.status).toBe("ok");
    expect(usage.monthly.usagePercent).toBe(92);
  });

  it("handles a plain object literal (no Solid Start wrapper)", () => {
    const html = `weeklyUsage:{status:"ok",resetInSec:123,usagePercent:45}`;
    const usage = parsePlanHtml(html);
    expect(usage.weekly.usagePercent).toBe(45);
    expect(usage.weekly.resetInSec).toBe(123);
  });

  it("normalizes missing windows to unavailable", () => {
    const html = `rollingUsage:{status:"ok",resetInSec:1,usagePercent:2}`;
    const usage = parsePlanHtml(html);
    expect(usage.weekly.status).toBe("unavailable");
    expect(usage.monthly.status).toBe("unavailable");
  });

  it("throws when no usage window is present", () => {
    expect(() => parsePlanHtml("<html><body>no data</body></html>")).toThrow(ParseError);
  });

  it("clamps usagePercent to [0,100]", () => {
    const html = `weeklyUsage:{status:"ok",resetInSec:123,usagePercent:150}`;
    expect(parsePlanHtml(html).weekly.usagePercent).toBe(100);
  });
});
