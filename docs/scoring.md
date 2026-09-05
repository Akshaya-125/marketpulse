# MarketPulse — Meaningful Change Score

## Goal
A deterministic, explainable 0–100 score per stock, per visit-comparison.
No LLM in this path — the number and its factor breakdown are pure functions
of numeric inputs so they're unit-testable and defensible.

## Inputs (all derived server-side, never trusted from client)
| Signal | Source |
|---|---|
| `priceDeviation` | `abs(currentPrice - lastVisitPrice) / lastVisitPrice`, normalized against the stock's own trailing volatility (z-score-ish, capped) |
| `volumeAnomaly` | `currentVolume / averageVolume(20d)`, normalized |
| `volatilityChange` | today's intraday range vs trailing average range |
| `relativePerformance` | stock % change minus sector % change (and vs market), rewards *divergence*, not raw magnitude |
| `eventImpact` | 1 if a known event (earnings/dividend/split/rating) fell in the comparison window, else 0 |
| `userPriority` | HIGH=1.0 / MEDIUM=0.6 / LOW=0.3 — a *multiplier on ranking*, not an additive score input (see below) |

## Formula
```
rawScore =
    0.30 * priceDeviation
  + 0.20 * volumeAnomaly
  + 0.15 * volatilityChange
  + 0.20 * relativePerformance
  + 0.15 * eventImpact

score = clamp(round(rawScore * 100), 0, 100)
```

Each component is pre-normalized to a 0–1 range before weighting (see
`normalize.ts`), so the weights are genuinely interpretable as "how much this
signal can move the needle," not fighting different unit scales.

## Why user priority is NOT in the additive score
Section 16 of the brief is explicit: high priority must not fabricate a high
score — that would make the score lie about what the market actually did.
Instead, `userPriority` is applied only when *ordering* the attention queue
among stocks with similar scores (a tie-breaker / gentle re-rank), and the UI
always shows the raw market score separately from the queue position. This
keeps the number itself trustworthy.

## Classification thresholds
```
0–30    NORMAL
30–60   WORTH_WATCHING
60–80   SIGNIFICANT
80–100  HIGH_ATTENTION
```
These are config values (`config/thresholds.ts`), not magic numbers scattered
through the code, so they can be tuned without touching the engine.

## Relative performance, worked example
- Stock +6.2%, sector +1.7%, market +0.4% → divergence ≈ 4.5–5.8pp →
  high `relativePerformance` → "significantly outperformed."
- Stock +6.2%, sector +6.0%, market +5.8% → divergence ≈ 0.2–0.4pp →
  low `relativePerformance` even though raw price move is identical →
  "moved with the market, not against it."

This is the single most important behavior the tests in
`tests/change.engine.test.ts` lock down — it's the actual differentiator
described in section 14 of the brief.

## Explainability contract
Every score returned by the API includes a `factors[]` array with each raw
component, its weight, and its contribution — the UI renders this directly as
the bar-chart breakdown. Nothing in the score is opaque.
