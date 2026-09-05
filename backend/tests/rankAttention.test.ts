import { describe, it, expect } from "vitest";
import { rankAttentionQueue } from "../src/change/rankAttention.js";
import type { StockChangeResult } from "../src/common/types.js";

function result(symbol: string, score: number): StockChangeResult {
  return {
    symbol,
    companyName: symbol,
    previousPrice: 100,
    currentPrice: 100 + score,
    percentChange: score,
    score,
    attentionLevel: score >= 80 ? "HIGH_ATTENTION" : score >= 60 ? "SIGNIFICANT" : score >= 30 ? "WORTH_WATCHING" : "NORMAL",
    factors: [],
    explanation: "",
    freshness: "FRESH",
  };
}

describe("rankAttentionQueue", () => {
  it("Test 9: HIGH priority does not overtake a materially higher market score", () => {
    const ranked = rankAttentionQueue([
      { result: result("A", 82), priority: "LOW" },
      { result: result("B", 68), priority: "HIGH" },
    ]);
    // B's priority boost (HIGH=1.0*3=3) can't close a 14-point score gap.
    expect(ranked[0].result.symbol).toBe("A");
  });

  it("priority breaks a near-tie between similar scores", () => {
    const ranked = rankAttentionQueue([
      { result: result("A", 70), priority: "LOW" },
      { result: result("B", 70), priority: "HIGH" },
    ]);
    expect(ranked[0].result.symbol).toBe("B");
  });

  it("attentionLevel classification is untouched by priority", () => {
    const ranked = rankAttentionQueue([{ result: result("A", 20), priority: "HIGH" }]);
    expect(ranked[0].result.attentionLevel).toBe("NORMAL");
  });
});
