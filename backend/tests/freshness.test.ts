import { describe, it, expect } from "vitest";
import { classifyFreshness } from "../src/marketdata/freshness.js";

describe("classifyFreshness", () => {
  const now = "2026-09-04T10:00:00.000Z";

  it("Test 6: data older than 15 minutes -> STALE", () => {
    const twentyMinAgo = "2026-09-04T09:40:00.000Z";
    expect(classifyFreshness(twentyMinAgo, now)).toBe("STALE");
  });

  it("Test 7: missing timestamp -> UNAVAILABLE (graceful handling of missing data)", () => {
    expect(classifyFreshness(null, now)).toBe("UNAVAILABLE");
  });

  it("data under 2 minutes old -> FRESH", () => {
    const oneMinAgo = "2026-09-04T09:59:00.000Z";
    expect(classifyFreshness(oneMinAgo, now)).toBe("FRESH");
  });

  it("data 5 minutes old -> DELAYED", () => {
    const fiveMinAgo = "2026-09-04T09:55:00.000Z";
    expect(classifyFreshness(fiveMinAgo, now)).toBe("DELAYED");
  });

  it("a timestamp in the future is never trusted as FRESH", () => {
    const future = "2026-09-04T10:05:00.000Z";
    expect(classifyFreshness(future, now)).toBe("UNAVAILABLE");
  });
});
