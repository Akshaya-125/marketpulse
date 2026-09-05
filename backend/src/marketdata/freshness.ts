import type { FreshnessStatus } from "../common/types.js";

// Configurable thresholds (minutes) — see docs/product-decisions.md
export const FRESHNESS_THRESHOLDS_MIN = {
  FRESH: 2,
  DELAYED: 15,
};

export function classifyFreshness(
  quoteTimestampIso: string | null,
  nowIso: string = new Date().toISOString()
): FreshnessStatus {
  if (!quoteTimestampIso) return "UNAVAILABLE";
  const ageMs =
    new Date(nowIso).getTime() - new Date(quoteTimestampIso).getTime();
  const ageMin = ageMs / 60000;
  if (ageMin < 0) return "UNAVAILABLE"; // never trust "future" data
  if (ageMin <= FRESHNESS_THRESHOLDS_MIN.FRESH) return "FRESH";
  if (ageMin <= FRESHNESS_THRESHOLDS_MIN.DELAYED) return "DELAYED";
  return "STALE";
}
