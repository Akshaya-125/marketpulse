import type { AttentionLevel } from "../common/types.js";

// See docs/scoring.md — tunable without touching engine logic.
export const WEIGHTS = {
  priceDeviation: 0.3,
  volumeAnomaly: 0.2,
  volatilityChange: 0.15,
  relativePerformance: 0.2,
  eventImpact: 0.15,
} as const;

export const ATTENTION_THRESHOLDS: { max: number; level: AttentionLevel }[] = [
  { max: 30, level: "NORMAL" },
  { max: 60, level: "WORTH_WATCHING" },
  { max: 80, level: "SIGNIFICANT" },
  { max: 100, level: "HIGH_ATTENTION" },
];

export function classifyScore(score: number): AttentionLevel {
  for (const t of ATTENTION_THRESHOLDS) {
    if (score <= t.max) return t.level;
  }
  return "HIGH_ATTENTION";
}

export const PRIORITY_RANK_WEIGHT: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
  HIGH: 1.0,
  MEDIUM: 0.6,
  LOW: 0.3,
};
