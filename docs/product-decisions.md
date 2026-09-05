# MarketPulse — Product & Engineering Decisions

## Stack: Node/TypeScript + React, not Java/Spring Boot
The two source documents disagreed (detailed spec → Java; pitch summary →
Node). Resolved in favor of Node because: (1) it's the stack already used for
prior shipped projects, (2) this build environment can only reach the npm
registry, not Maven Central, so Java dependencies aren't installable here,
(3) nothing about the product's core differentiator (the change-intelligence
engine) is stack-specific — it's a scoring function over numbers.

## SQLite instead of Postgres+Redis for this delivery
Documented in `architecture.md` §6. Repository interfaces are DB-agnostic;
swapping the driver is the only work needed to move to Postgres. Redis is
replaced by an in-process `Map`-based cache with the same
get/set/TTL/invalidate interface (`src/marketdata/cache.ts`) — same reasoning:
same contract, different backing store, documented rather than hidden.

## What's deliberately NOT built in this pass, and why
- **Auth/JWT** — a single demo user is seeded. Real auth is orthogonal to the
  differentiator and the brief explicitly says don't let it distract from the
  challenge (§23/§33). Documented as a clear next step.
- **LLM explanation layer** — the deterministic `factors[]` breakdown already
  satisfies the explainability requirement end-to-end. The optional
  natural-language layer is a thin wrapper *around* that data (never a
  decision-maker) and is stubbed with a clear `AI explanation unavailable —
  underlying analysis is still shown` fallback path, matching §19/§23, rather
  than wired to a real API key that would fail in review anyway.
- **News/events data** — no real news provider is wired in; `getEvents()`
  returns clearly-labeled synthetic demo events so the `eventImpact` signal
  is exercised without pretending to have live news.
- **Docker Compose for Postgres/Redis** — provided as a documented file
  (`docker-compose.yml`) for what a real deployment would run, but the app
  itself doesn't require Docker to run locally, which is a better reviewer
  experience.
- **Full accessibility audit, i18n, pagination for very large watchlists** —
  out of scope for an MVP demo; called out as future work.

## Conflicting-data policy
`MarketDataProvider` returns a `source` and `timestamp` with every quote.
When more than one source exists (mock vs external in a future dual-provider
setup), the merge policy is: prefer the source configured as `PRIMARY`;
if its timestamp is older than a fallback source's by more than the freshness
threshold, prefer the fresher one and log a `data_discrepancy` event; never
silently let an older timestamp overwrite a newer stored value.

## Freshness thresholds
```
< 2 min   FRESH
2–15 min  DELAYED
> 15 min  STALE
no data   UNAVAILABLE
```
Configurable in `src/marketdata/freshness.ts`, not hardcoded inline.
