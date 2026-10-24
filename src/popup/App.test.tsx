import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App.js";

function stubState(snapshot: unknown, settings: unknown, error: unknown, signedIn = false) {
  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage: vi.fn(async (msg: { type: string }) => {
        if (msg.type === "get-state") {
          return { ok: true, snapshot, settings, error, signedIn };
        }
        return { ok: true, signedIn: true };
      }),
    },
    tabs: {
      create: vi.fn(),
    },
  });
}

const okSnapshot = {
  plan: {
    rolling: { status: "ok", resetInSec: 18000, usagePercent: 10 },
    weekly: { status: "ok", resetInSec: 300000, usagePercent: 30 },
    monthly: { status: "ok", resetInSec: 600000, usagePercent: 50 },
  },
  fetchedAt: Date.now(),
};

const okSettings = { badgeMode: "remaining", refreshInterval: "15min", workspaceId: "wrk_x" };

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows sign-in CTA when signed out", async () => {
    stubState(null, null, null, false);
    render(<App />);
    await waitFor(() => expect(screen.getByText("Sign in to opencode.ai")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Open opencode.ai" })).toBeInTheDocument();
  });

  it("renders weekly pills and forecast from a snapshot", async () => {
    stubState(okSnapshot, okSettings, null, true);
    render(<App />);
    await waitFor(() => expect(screen.getByText(/OpenCode Go/)).toBeInTheDocument());
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(screen.getAllByText("Used").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5h").length).toBeGreaterThan(0);
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Month")).toBeInTheDocument();
  });

  it("uses the 31-day monthly window length for elapsed pace", async () => {
    const snapshot = {
      plan: {
        rolling: { status: "ok", resetInSec: 18000, usagePercent: 10, windowMs: 5 * 60 * 60 * 1000 },
        weekly: {
          status: "ok",
          resetInSec: 300000,
          usagePercent: 30,
          windowMs: 7 * 24 * 60 * 60 * 1000,
        },
        monthly: {
          status: "ok",
          resetInSec: (30 * 24 + 17) * 60 * 60,
          usagePercent: 0,
          windowMs: 31 * 24 * 60 * 60 * 1000,
        },
      },
      fetchedAt: Date.now(),
    };

    stubState(snapshot, okSettings, null, true);
    render(<App />);
    await waitFor(() => expect(screen.getByText("Elapsed")).toBeInTheDocument());
    // 7h elapsed of 31d, rather than the 0% a 30-day nominal window gives.
    expect(screen.getByText("0.9%")).toBeInTheDocument();
  });

  it("shows error when no snapshot and error set", async () => {
    stubState(null, okSettings, "HTTP 500", true);
    render(<App />);
    await waitFor(() => expect(screen.getByText("HTTP 500")).toBeInTheDocument());
  });
});
