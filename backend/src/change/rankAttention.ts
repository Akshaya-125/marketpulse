import type { Priority, StockChangeResult } from "../common/types.js";
import { PRIORITY_RANK_WEIGHT } from "./thresholds.js";

export interface RankedChange {
  result: StockChangeResult;
  priority: Priority;
  rankScore: number; // used only for ordering, never displayed as "the score"
}

/**
 * Orders the attention queue. Market score dominates; priority only
 * nudges ordering among stocks that are otherwise close, per brief §16 —
 * HIGH priority must not turn a NORMAL stock into HIGH_ATTENTION.
 */
export function rankAttentionQueue(
  items: { result: StockChangeResult; priority: Priority }[]
): RankedChange[] {
  return items
    .map((item) => ({
      ...item,
      rankScore: item.result.score + PRIORITY_RANK_WEIGHT[item.priority] * 3,
    }))
    .sort((a, b) => b.rankScore - a.rankScore);
}
