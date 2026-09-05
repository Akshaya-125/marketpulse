import type { ChangeFactor } from "../common/types.js";

/**
 * Template-based, deterministic explanation string. No LLM in this path —
 * if an LLM explanation layer is added later, it may only rephrase these
 * same facts, never add new ones (brief §19/§7 explanation layer rule).
 */
export function buildExplanation(
  symbol: string,
  percentChange: number,
  factors: ChangeFactor[]
): string {
  const direction = percentChange >= 0 ? "up" : "down";
  const parts: string[] = [
    `${symbol} is ${direction} ${Math.abs(percentChange).toFixed(1)}% since your last visit.`,
  ];

  const byContribution = [...factors].sort(
    (a, b) => b.contribution - a.contribution
  );
  const top = byContribution.filter((f) => f.contribution >= 5).slice(0, 3);

  const clauses: string[] = [];
  for (const f of top) {
    switch (f.key) {
      case "volumeAnomaly":
        clauses.push("trading at unusually high volume");
        break;
      case "relativePerformance":
        clauses.push("diverging noticeably from its sector and the broader market");
        break;
      case "volatilityChange":
        clauses.push("moving well outside its normal daily range");
        break;
      case "priceDeviation":
        clauses.push("showing a larger move than its recent history would suggest");
        break;
      case "eventImpact":
        clauses.push("coinciding with a detected market event");
        break;
    }
  }

  if (clauses.length > 0) {
    parts.push(clauses.join(", ") + ".");
  }

  return parts.join(" ");
}
